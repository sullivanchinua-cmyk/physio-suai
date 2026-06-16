/**
 * PHYSIO SUAI – Offline-First Messaging (IndexedDB via raw IDB API)
 * WhatsApp-style: write locally first, sync to Firebase when online.
 * Section savepoints: assignment, novel, buybooks, business, funjokes, studyai
 */
(function(window) {
  'use strict';
  var DB_NAME='LocalChatDB', DB_VER=3, _db=null;

  function _open(){
    return new Promise(function(res,rej){
      if(_db){res(_db);return;}
      var r=indexedDB.open(DB_NAME,DB_VER);
      r.onupgradeneeded=function(e){
        var db=e.target.result;
        if(!db.objectStoreNames.contains('messages')){
          var ms=db.createObjectStore('messages',{keyPath:'localId',autoIncrement:true});
          ms.createIndex('chatId','chatId',{unique:false});
          ms.createIndex('syncStatus','syncStatus',{unique:false});
          ms.createIndex('timestamp','timestamp',{unique:false});
        }
        if(!db.objectStoreNames.contains('media'))    db.createObjectStore('media',{keyPath:'remoteUrl'});
        if(!db.objectStoreNames.contains('savepoints')) db.createObjectStore('savepoints',{keyPath:'section'});
        if(!db.objectStoreNames.contains('readmarks'))  db.createObjectStore('readmarks',{keyPath:'chatId'});
      };
      r.onsuccess=function(e){_db=e.target.result;res(_db);};
      r.onerror=function(e){rej(e.target.error);};
    });
  }

  window.OfflineDB={
    saveLocalMessage:function(chatId,msg){
      return _open().then(function(db){return new Promise(function(res,rej){
        var rec=Object.assign({},msg,{chatId:chatId,syncStatus:'local_only',localTs:Date.now()});
        var tx=db.transaction('messages','readwrite');
        var r=tx.objectStore('messages').add(rec);
        r.onsuccess=function(e){res(e.target.result);}; r.onerror=function(e){rej(e.target.error);};
      });});
    },
    cacheRemoteMessage:function(chatId,msg){
      return _open().then(function(db){return new Promise(function(res){
        var rec=Object.assign({},msg,{chatId:chatId,syncStatus:'synced'});
        var r=db.transaction('messages','readwrite').objectStore('messages').put(rec);
        r.onsuccess=function(e){res(e.target.result);}; r.onerror=function(){res(null);};
      });});
    },
    getMessages:function(chatId,limit){
      return _open().then(function(db){return new Promise(function(res){
        var r=db.transaction('messages','readonly').objectStore('messages').index('chatId').getAll(IDBKeyRange.only(chatId));
        r.onsuccess=function(e){
          var msgs=(e.target.result||[]).sort(function(a,b){return(a.timestamp||a.localTs||0)-(b.timestamp||b.localTs||0);});
          res(limit?msgs.slice(-limit):msgs);
        }; r.onerror=function(){res([]);};
      });});
    },
    syncPending:function(){
      var online=window.CordovaNetwork?window.CordovaNetwork.isOnline():navigator.onLine;
      if(!online) return Promise.resolve(0);
      return _open().then(function(db){return new Promise(function(res){
        var tx=db.transaction('messages','readwrite');
        var r=tx.objectStore('messages').index('syncStatus').getAll(IDBKeyRange.only('local_only'));
        r.onsuccess=function(e){
          var pending=e.target.result||[];
          if(!pending.length){res(0);return;}
          var done=0;
          pending.forEach(function(msg){
            if(!window.db){if(++done===pending.length)res(done);return;}
            var ref=window.db.ref('messages/'+msg.chatId).push();
            var payload=Object.assign({},msg); delete payload.localId; delete payload.syncStatus; delete payload.localTs;
            ref.set(payload,function(err){
              if(!err){
                var tx2=db.transaction('messages','readwrite');
                var r2=tx2.objectStore('messages').get(msg.localId);
                r2.onsuccess=function(ev){var rec=ev.target.result; if(rec){rec.syncStatus='synced';rec.firebaseKey=ref.key;tx2.objectStore('messages').put(rec);}};
              }
              if(++done===pending.length)res(done);
            });
          });
        }; r.onerror=function(){res(0);};
      });});
    },
    markRead:function(chatId){
      return _open().then(function(db){return new Promise(function(res){
        var r=db.transaction('readmarks','readwrite').objectStore('readmarks').put({chatId:chatId,lastRead:Date.now()});
        r.onsuccess=res; r.onerror=res;
      });});
    },
    saveSavepoint:function(section,data){
      return _open().then(function(db){return new Promise(function(res){
        var r=db.transaction('savepoints','readwrite').objectStore('savepoints').put({section:section,data:data,savedAt:Date.now()});
        r.onsuccess=res; r.onerror=res;
      });});
    },
    getSavepoint:function(section){
      return _open().then(function(db){return new Promise(function(res){
        var r=db.transaction('savepoints','readonly').objectStore('savepoints').get(section);
        r.onsuccess=function(e){res(e.target.result||null);}; r.onerror=function(){res(null);};
      });});
    },
    cacheMedia:function(remoteUrl,localPath){
      return _open().then(function(db){return new Promise(function(res){
        var r=db.transaction('media','readwrite').objectStore('media').put({remoteUrl:remoteUrl,localPath:localPath,cachedAt:Date.now()});
        r.onsuccess=res; r.onerror=res;
      });});
    },
    getMediaLocalPath:function(remoteUrl){
      return _open().then(function(db){return new Promise(function(res){
        var r=db.transaction('media','readonly').objectStore('media').get(remoteUrl);
        r.onsuccess=function(e){res(e.target.result?e.target.result.localPath:null);}; r.onerror=function(){res(null);};
      });});
    },
    downloadAndCacheMedia:function(remoteUrl,fileName,mediaType){
      return window.OfflineDB.getMediaLocalPath(remoteUrl).then(function(existing){
        if(existing) return existing;
        return fetch(remoteUrl).then(function(r){return r.blob();}).then(function(blob){
          return new Promise(function(res){
            var reader=new FileReader(); reader.onloadend=function(){
              var b64=reader.result.split(',')[1];
              if(window.saveMediaToDevice){
                window.saveMediaToDevice(b64,fileName,mediaType).then(function(lp){window.OfflineDB.cacheMedia(remoteUrl,lp);res(lp);}).catch(function(){res(URL.createObjectURL(blob));});
              } else res(URL.createObjectURL(blob));
            }; reader.onerror=function(){res(remoteUrl);}; reader.readAsDataURL(blob);
          });
        }).catch(function(){return remoteUrl;});
      });
    }
  };

  window.addEventListener('online',function(){setTimeout(function(){window.OfflineDB.syncPending();},1000);});
  if(window.CordovaNetwork) window.CordovaNetwork.onStatusChange(function(on){if(on) window.OfflineDB.syncPending();});
  document.addEventListener('resume',function(){window.OfflineDB.syncPending();},false);
  console.log('[OfflineDB] Ready');
})(window);
