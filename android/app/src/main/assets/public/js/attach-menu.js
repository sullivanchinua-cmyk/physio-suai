/**
 * PHYSIO SUAI – Attach Menu v18 CAPACITOR NATIVE
 * Gallery   → @capacitor/camera PHOTOS source (native Android gallery overlay)
 * Camera    → WebRTC getUserMedia() ONLY (anti-native, no system camera app)
 * Audio     → @odion-cloud/capacitor-mediastore (WhatsApp-style list from MediaStore)
 * Document  → @odion-cloud/capacitor-mediastore (WhatsApp-style document list)
 * Contact   → @capacitor-community/contacts (searchable HTML list, phone book)
 * Location  → @capacitor/geolocation
 * Poll/Event → inline HTML UI
 */

var _attachCB  = null;
var _aInjected = false;

function _injectStyles() {
  if (document.getElementById('_aCSSr18')) return;
  var s = document.createElement('style'); s.id = '_aCSSr18';
  s.textContent = [
    '@keyframes _aUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
    '._ao{position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;-webkit-tap-highlight-color:transparent}',
    '._ap{width:100%;max-width:520px;margin:0 auto;background:#1f2c34;border-radius:20px 20px 0 0;padding:20px 16px 36px;animation:_aUp .25s cubic-bezier(.34,1.1,.64,1)}',
    '._ah{width:36px;height:4px;background:#4b5563;border-radius:2px;margin:0 auto 22px}',
    '._ag{display:grid;grid-template-columns:repeat(4,1fr);gap:20px 8px}',
    '._ai{display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;background:none;border:none;padding:4px;font-family:inherit;-webkit-tap-highlight-color:transparent}',
    '._ai:active ._aic{transform:scale(.88)}',
    '._aic{width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;transition:transform .1s;background:linear-gradient(135deg,#9333ea,#ec4899)}',
    '._ail{font-size:12.5px;color:#e5e7eb;font-weight:500;pointer-events:none}',
    '._mSheet{position:fixed;inset:0;z-index:9850;background:rgba(0,0,0,.55);display:flex;flex-direction:column;justify-content:flex-end}',
    '._mPanel{background:#111827;border-radius:20px 20px 0 0;max-height:82vh;display:flex;flex-direction:column;animation:_aUp .28s cubic-bezier(.34,1.1,.64,1)}',
    '._mRow{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '._mRow:active{background:rgba(255,255,255,.05)}',
    '._mIcon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    '._mName{color:#f9fafb;font-size:13.5px;font-weight:500;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '._mMeta{color:#6b7280;font-size:11px;margin-top:2px}',
    '._cRow{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '._cRow:active{background:rgba(255,255,255,.05)}',
    '._cAvt{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;color:#fff;font-size:17px;overflow:hidden}',
    '._sInp{width:100%;padding:10px 14px;background:rgba(255,255,255,.07);border:none;border-radius:10px;color:#f9fafb;font-size:14px;outline:none;margin-bottom:2px;box-sizing:border-box}'
  ].join('');
  document.head.appendChild(s);
}

var SVGS={
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
  camera:  '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  location:'<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  contact: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  document:'<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  audio:   '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>',
  poll:    '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  event:   '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
};

function showAttachMenu(callback, opts) {
  var now=Date.now(); if(now-(showAttachMenu._last||0)<600) return; showAttachMenu._last=now;
  _attachCB=callback; _injectStyles();
  var existing=document.getElementById('_aOvr');
  if(existing){existing.remove();_attachCB=null;return;}

  var ITEMS=[
    {id:'gallery',label:'Gallery'},{id:'camera',label:'Camera'},
    {id:'location',label:'Location'},{id:'contact',label:'Contact'},
    {id:'document',label:'Document'},{id:'audio',label:'Audio'},
    {id:'poll',label:'Poll'},{id:'event',label:'Event'}
  ];

  var ov=document.createElement('div'); ov.id='_aOvr'; ov.className='_ao';
  var _r=false; setTimeout(function(){_r=true;},400);
  ov.addEventListener('click',function(e){if(_r&&e.target===ov){ov.remove();_attachCB=null;}});

  var pan=document.createElement('div'); pan.className='_ap';
  pan.innerHTML='<div class="_ah"></div><div class="_ag" id="_aGrid"></div>';
  var grid=pan.querySelector('#_aGrid');
  ITEMS.forEach(function(item){
    var btn=document.createElement('button'); btn.className='_ai'; btn.type='button';
    btn.innerHTML='<div class="_aic">'+(SVGS[item.id]||'')+'</div><span class="_ail">'+item.label+'</span>';
    btn.onclick=function(e){e.stopPropagation();ov.remove();_execAction(item.id);};
    grid.appendChild(btn);
  });
  ov.appendChild(pan); document.body.appendChild(ov);
}

function _execAction(a){
  if(a==='gallery')  _openNativeGallery();
  else if(a==='camera')   _openCameraWebRTC();
  else if(a==='location') _openNativeLocation();
  else if(a==='contact')  _openNativeContacts();
  else if(a==='audio')    _openNativeAudioList();
  else if(a==='document') _openNativeDocList();
  else if(a==='poll')     _openPoll();
  else if(a==='event')    _openEvent();
}

// ═══ GALLERY — @capacitor/camera PHOTOS source (native Android photo picker) ═══
function _openNativeGallery() {
  var Camera = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
  if (Camera) {
    Camera.getPhoto({ quality:90, allowEditing:false, resultType:'uri', source:'PHOTOS', saveToGallery:false })
      .then(function(r){
        _uriToFile(r.webPath||r.path, function(f){ if(f&&_attachCB){var cb=_attachCB;_attachCB=null;cb(f);} });
      })
      .catch(function(err){ console.warn('[Gallery] Cap error, fallback:', err); _galleryFilePicker(); });
  } else { _galleryFilePicker(); }
}
function _galleryFilePicker(){
  var inp=_tmpInput('image/*,video/*');
  inp.onchange=function(){if(inp.files&&inp.files[0]&&_attachCB){var cb=_attachCB;_attachCB=null;cb(inp.files[0]);}inp.value='';};
  inp.click();
}
function _uriToFile(uri, cb){
  try{
    var xhr=new XMLHttpRequest(); xhr.open('GET',uri,true); xhr.responseType='blob';
    xhr.onload=function(){ if(xhr.status===200||xhr.status===0){ var n=uri.split('/').pop()||('img_'+Date.now()+'.jpg'); cb(new File([xhr.response],n,{type:xhr.response.type||'image/jpeg'})); }else cb(null); };
    xhr.onerror=function(){cb(null);}; xhr.send();
  }catch(e){cb(null);}
}

// ═══ CAMERA — WebRTC ONLY (anti-native, no system camera app) ═══════════════
function _openCameraWebRTC(){
  _injectStyles();
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9900;background:#000;display:flex;flex-direction:column';
  var video=document.createElement('video'); video.autoplay=true; video.playsinline=true; video.muted=true;
  video.style.cssText='flex:1;object-fit:cover;width:100%;max-height:calc(100vh - 120px)';
  var bar=document.createElement('div');
  bar.style.cssText='height:120px;display:flex;align-items:center;justify-content:space-around;padding:0 32px;background:#111;flex-shrink:0';
  var btnX=_ctrlBtn('<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>');
  var btnShoot=document.createElement('button');
  btnShoot.style.cssText='width:68px;height:68px;border-radius:50%;border:4px solid white;background:white;cursor:pointer;-webkit-tap-highlight-color:transparent';
  var btnFlip=_ctrlBtn('<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>');
  bar.appendChild(btnX); bar.appendChild(btnShoot); bar.appendChild(btnFlip);
  ov.appendChild(video); ov.appendChild(bar); document.body.appendChild(ov);

  var stream=null, facing='environment';
  function startCam(){ if(stream)stream.getTracks().forEach(function(t){t.stop();}); navigator.mediaDevices.getUserMedia({video:{facingMode:facing},audio:false}).then(function(s){stream=s;video.srcObject=s;}).catch(function(e){ov.remove();_galleryFilePicker();}); }
  startCam();
  btnX.onclick=function(){if(stream)stream.getTracks().forEach(function(t){t.stop();});ov.remove();_attachCB=null;};
  btnFlip.onclick=function(){facing=facing==='environment'?'user':'environment';startCam();};
  btnShoot.onclick=function(){
    var c=document.createElement('canvas'); c.width=video.videoWidth||1280; c.height=video.videoHeight||720;
    c.getContext('2d').drawImage(video,0,0);
    c.toBlob(function(blob){if(stream)stream.getTracks().forEach(function(t){t.stop();});ov.remove();if(blob&&_attachCB){var cb=_attachCB;_attachCB=null;cb(new File([blob],'photo_'+Date.now()+'.jpg',{type:'image/jpeg'}));}}, 'image/jpeg',0.92);
  };
}
function _ctrlBtn(svg){ var b=document.createElement('button'); b.style.cssText='width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.15);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent'; b.innerHTML=svg; return b; }

// ═══ LOCATION — @capacitor/geolocation ═════════════════════════════════════
function _openNativeLocation(){
  var ov=_mkSheet('Share Location',
    '<div style="text-align:center;padding:24px 16px 8px">'+
    '<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>'+
    '<p style="color:#f9fafb;font-size:16px;font-weight:700;margin:0 0 8px">Share Location</p>'+
    '<p style="color:#6b7280;font-size:13px;margin:0 0 24px">Tap to share your GPS location</p>'+
    '<button id="_locBtn" style="background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;border:none;border-radius:14px;padding:14px 32px;font-size:15px;font-weight:600;cursor:pointer;width:80%;max-width:260px">Get Location</button>'+
    '<p id="_locSt" style="color:#6b7280;font-size:12px;margin-top:12px;min-height:18px"></p></div>'
  );
  ov.querySelector('#_locBtn').onclick=function(){
    var st=ov.querySelector('#_locSt'); st.textContent='Getting location…';
    var Geo=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Geolocation;
    var doGeo=function(){
      var geoFn = Geo ? Geo.getCurrentPosition.bind(Geo,{enableHighAccuracy:true,timeout:15000}) : function(){ return new Promise(function(res,rej){ navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000,maximumAge:0}); }); };
      var geoPromise = Geo ? Geo.getCurrentPosition({enableHighAccuracy:true,timeout:15000}) : new Promise(function(res,rej){ navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000,maximumAge:0}); });
      geoPromise.then(function(pos){
        ov.remove();
        if(_attachCB){ var cb=_attachCB;_attachCB=null; var lat=(pos.coords||pos).latitude.toFixed(6),lng=(pos.coords||pos).longitude.toFixed(6); cb({_isLocation:true,lat:lat,lng:lng,text:'My Location: '+lat+','+lng,mapUrl:'https://maps.google.com/?q='+lat+','+lng}); }
      }).catch(function(e){ st.textContent='Error: '+(e.message||'Could not get location'); });
    };
    if(Geo){ Geo.checkPermissions().then(function(p){ if(p.location==='granted'){doGeo();}else{ Geo.requestPermissions().then(doGeo).catch(function(){st.textContent='Permission denied';}); }}).catch(doGeo); } else doGeo();
  };
}

// ═══ CONTACTS — @capacitor-community/contacts (searchable HTML list) ═══════
function _openNativeContacts(){
  var ov=_mkSheet('Select Contact',
    '<div style="padding:12px 16px 8px"><input id="_cSrch" class="_sInp" placeholder="Search contacts…" autocomplete="off"></div>'+
    '<div id="_cList" style="flex:1;overflow-y:auto;overscroll-behavior:contain"><p style="text-align:center;color:#6b7280;font-size:13px;padding:32px 16px" id="_cLoad">Loading contacts…</p></div>'
  );
  var all=[];
  function renderContacts(contacts){
    var list=ov.querySelector('#_cList');
    if(!contacts.length){list.innerHTML='<p style="text-align:center;color:#6b7280;font-size:13px;padding:32px 16px">No contacts found</p>';return;}
    list.innerHTML=contacts.slice(0,300).map(function(c,i){
      var init=(c.displayName||'?').charAt(0).toUpperCase();
      var photo=c.photoURI?'<img src="'+c.photoURI+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':'<span>'+init+'</span>';
      return '<div class="_cRow" data-idx="'+i+'"><div class="_cAvt">'+photo+'</div><div style="flex:1;min-width:0"><div style="color:#f9fafb;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(c.displayName||'Unknown')+'</div><div style="color:#6b7280;font-size:12px;margin-top:2px">'+_esc(c.phoneNumber||'')+'</div></div></div>';
    }).join('');
    list.querySelectorAll('._cRow').forEach(function(row){
      row.onclick=function(){ var c=contacts[parseInt(row.getAttribute('data-idx'))]; ov.remove(); if(_attachCB&&c){var cb=_attachCB;_attachCB=null;cb({_isContact:true,name:c.displayName,phone:c.phoneNumber,text:c.displayName+' — '+c.phoneNumber});} };
    });
  }
  var Contacts=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Contacts;
  if(Contacts){
    Contacts.checkPermissions().then(function(p){
      var doLoad=function(){
        Contacts.getContacts({projection:{name:true,phones:true,image:true}}).then(function(r){
          all=(r.contacts||[]).map(function(c){ return {displayName:(c.name&&c.name.display)||'Unknown',phoneNumber:(c.phones&&c.phones[0])?c.phones[0].number:'',photoURI:c.image&&c.image.base64String?'data:image/jpeg;base64,'+c.image.base64String:null}; }).filter(function(c){return c.phoneNumber;}).sort(function(a,b){return(a.displayName).localeCompare(b.displayName);});
          renderContacts(all);
        }).catch(function(){ov.querySelector('#_cLoad').textContent='Failed to load contacts.';});
      };
      if(p.contacts==='granted')doLoad();
      else Contacts.requestPermissions().then(doLoad).catch(function(){ov.querySelector('#_cLoad').textContent='Permission denied.';});
    }).catch(function(){ ov.querySelector('#_cLoad').textContent='Contacts not available.'; });
  } else { ov.querySelector('#_cLoad').textContent='Contacts plugin not available on this platform.'; }
  var si=ov.querySelector('#_cSrch');
  if(si) si.addEventListener('input',function(){ var q=si.value.toLowerCase(); renderContacts(q?all.filter(function(c){return(c.displayName||'').toLowerCase().includes(q)||(c.phoneNumber||'').includes(q);}):all); });
}

// ═══ AUDIO — @odion-cloud/capacitor-mediastore WhatsApp-style list ══════════
function _openNativeAudioList(){
  var ov=_mkSheet('Audio',
    '<div style="padding:12px 16px 8px"><input id="_aSrch" class="_sInp" placeholder="Search audio…"></div>'+
    '<div id="_aList" style="flex:1;overflow-y:auto;overscroll-behavior:contain"><p style="text-align:center;color:#6b7280;font-size:13px;padding:32px 16px">Scanning audio files…</p></div>'
  );
  var allAudio=[];
  function renderAudio(items){
    var list=ov.querySelector('#_aList');
    if(!items.length){list.innerHTML='<p style="text-align:center;color:#6b7280;font-size:13px;padding:32px 16px">No audio files found</p>';return;}
    list.innerHTML=items.slice(0,300).map(function(item,i){
      return '<div class="_mRow" data-idx="'+i+'"><div class="_mIcon" style="background:linear-gradient(135deg,#7c3aed,#a855f7)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div><div style="flex:1;min-width:0"><div class="_mName">'+_esc(item.name)+'</div><div class="_mMeta">'+_fmtSz(item.size)+'</div></div></div>';
    }).join('');
    list.querySelectorAll('._mRow').forEach(function(row){
      row.onclick=function(){ var item=items[parseInt(row.getAttribute('data-idx'))]; ov.remove(); if(_attachCB&&item){var cb=_attachCB;_attachCB=null;cb({_isMediaUri:true,uri:item.uri,name:item.name,size:item.size,mediaType:'audio',text:item.name});} };
    });
  }
  var MS=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorMediaStore;
  var doScan=function(){
    if(MS){
      MS.getMediasByType({mediaType:'audio',includeExternal:true}).then(function(r){
        allAudio=(r.medias||r.media||r.files||[]).map(function(m){return{name:m.name||m.displayName,uri:m.uri||m.contentUri,size:m.size,dateModified:m.dateModified};});
        renderAudio(allAudio);
      }).catch(function(){_audioFilePicker();});
    } else _audioFilePicker();
  };
  // Request permission then scan
  if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.LocalNotifications){
    // Use built-in Capacitor permission check via Camera (has requestPermissions)
    doScan();
  } else doScan();
  var si=ov.querySelector('#_aSrch');
  if(si) si.addEventListener('input',function(){var q=si.value.toLowerCase();renderAudio(q?allAudio.filter(function(a){return a.name.toLowerCase().includes(q);}):allAudio);});
}
function _audioFilePicker(){ var inp=_tmpInput('audio/*'); inp.onchange=function(){if(inp.files&&inp.files[0]&&_attachCB){var cb=_attachCB;_attachCB=null;cb(inp.files[0]);}inp.value='';};inp.click();}

// ═══ DOCUMENTS — @odion-cloud/capacitor-mediastore WhatsApp-style list ══════
function _openNativeDocList(){
  var ov=_mkSheet('Documents',
    '<div style="padding:12px 16px 8px"><input id="_dSrch" class="_sInp" placeholder="Search documents…"></div>'+
    '<div id="_dList" style="flex:1;overflow-y:auto;overscroll-behavior:contain"><p style="text-align:center;color:#6b7280;font-size:13px;padding:32px 16px">Scanning documents…</p></div>'
  );
  var allDocs=[];
  var extColors={pdf:'#ef4444',doc:'#3b82f6',docx:'#3b82f6',xls:'#22c55e',xlsx:'#22c55e',ppt:'#f97316',pptx:'#f97316',txt:'#6b7280',csv:'#22c55e'};
  function renderDocs(items){
    var list=ov.querySelector('#_dList');
    if(!items.length){list.innerHTML='<p style="text-align:center;color:#6b7280;font-size:13px;padding:32px 16px">No documents found</p>';return;}
    list.innerHTML=items.slice(0,200).map(function(item,i){
      var ext=(item.name.split('.').pop()||'').toLowerCase();
      var color=extColors[ext]||'#6b7280';
      return '<div class="_mRow" data-idx="'+i+'"><div class="_mIcon" style="background:'+color+';border-radius:10px"><span style="color:#fff;font-weight:800;font-size:10px">'+ext.toUpperCase()+'</span></div><div style="flex:1;min-width:0"><div class="_mName">'+_esc(item.name)+'</div><div class="_mMeta">'+_fmtSz(item.size)+'</div></div></div>';
    }).join('');
    list.querySelectorAll('._mRow').forEach(function(row){
      row.onclick=function(){ var item=items[parseInt(row.getAttribute('data-idx'))]; ov.remove(); if(_attachCB&&item){var cb=_attachCB;_attachCB=null;cb({_isMediaUri:true,uri:item.uri,name:item.name,size:item.size,mediaType:'document',text:item.name});} };
    });
  }
  var MS=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.CapacitorMediaStore;
  if(MS){
    MS.getMediasByType({mediaType:'document',includeExternal:true}).then(function(r){
      allDocs=(r.medias||r.media||r.files||[]).map(function(m){return{name:m.name||m.displayName,uri:m.uri||m.contentUri,size:m.size};});
      renderDocs(allDocs);
    }).catch(function(){_docFilePicker();});
  } else _docFilePicker();
  var si=ov.querySelector('#_dSrch');
  if(si) si.addEventListener('input',function(){var q=si.value.toLowerCase();renderDocs(q?allDocs.filter(function(d){return d.name.toLowerCase().includes(q);}):allDocs);});
}
function _docFilePicker(){ var inp=_tmpInput('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'); inp.onchange=function(){if(inp.files&&inp.files[0]&&_attachCB){var cb=_attachCB;_attachCB=null;cb(inp.files[0]);}inp.value='';};inp.click();}

// ═══ POLL ════════════════════════════════════════════════════════════════════
function _openPoll(){
  var ov=_mkSheet('Create Poll',
    '<div style="padding:16px"><input id="_pQ" class="_sInp" style="margin-bottom:10px" placeholder="Poll question"><input id="_pO1" class="_sInp" style="margin-bottom:8px" placeholder="Option 1"><input id="_pO2" class="_sInp" style="margin-bottom:8px" placeholder="Option 2"><input id="_pO3" class="_sInp" style="margin-bottom:18px" placeholder="Option 3 (optional)"><button id="_pSend" style="width:100%;padding:14px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer">Create Poll</button></div>'
  );
  ov.querySelector('#_pSend').onclick=function(){
    var q=(ov.querySelector('#_pQ')||{value:''}).value.trim(),o1=(ov.querySelector('#_pO1')||{value:''}).value.trim(),o2=(ov.querySelector('#_pO2')||{value:''}).value.trim(),o3=(ov.querySelector('#_pO3')||{value:''}).value.trim();
    if(!q||!o1||!o2) return;
    ov.remove(); if(_attachCB){var cb=_attachCB;_attachCB=null;var opts=[o1,o2];if(o3)opts.push(o3);cb({_isPoll:true,question:q,options:opts,text:'📊 Poll: '+q});}
  };
}

// ═══ EVENT ══════════════════════════════════════════════════════════════════
function _openEvent(){
  var ov=_mkSheet('Create Event',
    '<div style="padding:16px"><input id="_evT" class="_sInp" style="margin-bottom:10px" placeholder="Event title"><input id="_evD" type="datetime-local" class="_sInp" style="margin-bottom:10px"><input id="_evL" class="_sInp" style="margin-bottom:18px" placeholder="Location (optional)"><button id="_evS" style="width:100%;padding:14px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer">Share Event</button></div>'
  );
  ov.querySelector('#_evS').onclick=function(){
    var t=(ov.querySelector('#_evT')||{value:''}).value.trim(),d=(ov.querySelector('#_evD')||{value:''}).value,l=(ov.querySelector('#_evL')||{value:''}).value.trim();
    if(!t) return;
    ov.remove(); if(_attachCB){var cb=_attachCB;_attachCB=null;cb({_isEvent:true,title:t,date:d,location:l,text:'📅 Event: '+t+(d?' at '+d:'')});}
  };
}

// ═══ HELPERS ═════════════════════════════════════════════════════════════════
function _mkSheet(title,bodyHtml){
  var ov=document.createElement('div'); ov.className='_mSheet';
  ov.innerHTML='<div class="_mPanel"><div style="padding:10px 0 6px;display:flex;justify-content:center;flex-shrink:0"><div style="width:36px;height:4px;background:#374151;border-radius:2px"></div></div><div style="display:flex;align-items:center;padding:6px 14px 12px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.06)"><p style="color:#f9fafb;font-weight:700;font-size:16px;margin:0;flex:1">'+title+'</p><button id="_shClose" style="background:none;border:none;cursor:pointer;padding:6px;color:#9ca3af"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'+bodyHtml+'</div>';
  var _r=false; setTimeout(function(){_r=true;},300);
  ov.addEventListener('click',function(e){if(_r&&e.target===ov){ov.remove();_attachCB=null;}});
  document.body.appendChild(ov);
  var cb=ov.querySelector('#_shClose'); if(cb) cb.onclick=function(){ov.remove();_attachCB=null;};
  return ov;
}
function _fmtSz(b){ if(!b)return''; if(b<1024)return b+' B'; if(b<1048576)return(b/1024).toFixed(1)+' KB'; return(b/1048576).toFixed(1)+' MB'; }
function _esc(s){ return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _tmpInput(a){ var id='_tmpI_'+a.replace(/[^a-z]/g,'_'); var el=document.getElementById(id); if(!el){el=document.createElement('input');el.type='file';el.id=id;el.accept=a;el.style.cssText='position:fixed;top:-9999px;left:-9999px;opacity:0;width:1px;height:1px;pointer-events:none';document.body.appendChild(el);} return el; }
window._openContactPicker=_openNativeContacts;
