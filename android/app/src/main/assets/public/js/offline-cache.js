// ── Physio SUAI Offline Cache ────────────────────────────────────────────────
// Stores messages + media so the app works fully offline (read-only) like WhatsApp.
// Messages go into IndexedDB.  Media (images, video, audio, stickers) go into
// the Cache API so they can be served from sw.js as well.
//
// Usage:
//   OfflineCache.saveMsg('public_chat', msgId, msgObj)
//   OfflineCache.getMsgs('public_chat', limit?)      → Promise<msgObj[]>
//   OfflineCache.saveMedia(url)                      → Promise (fetches & caches)
//   OfflineCache.isOnline()                          → bool
//   OfflineCache.onConnChange(fn)                    → register listener
// ─────────────────────────────────────────────────────────────────────────────

var OfflineCache = (function() {
  'use strict';

  var DB_NAME  = 'physioSUAI_offline';
  var DB_VER   = 2;
  var CACHE_NAME = 'physio-media-v1';
  var MAX_MSGS_PER_ROOM = 500;       // keep last 500 msgs per room
  var MAX_MEDIA_BYTES   = 150 * 1024 * 1024; // 150 MB total media quota

  // ── IndexedDB bootstrap ────────────────────────────────────────────────────
  var _db = null;
  var _dbReady = new Promise(function(resolve, reject) {
    try {
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function(ev) {
        var db = ev.target.result;
        // messages store: keyPath = composite "room__msgId"
        if (!db.objectStoreNames.contains('messages')) {
          var ms = db.createObjectStore('messages', { keyPath: '_pk' });
          ms.createIndex('byRoom', 'room', { unique: false });
          ms.createIndex('byRoomTs', ['room','ts'], { unique: false });
        }
        // media url → cached status
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'url' });
        }
        // meta (quota tracking, last sync ts per room)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      };
      req.onsuccess = function(ev) { _db = ev.target.result; resolve(_db); };
      req.onerror   = function(ev) { console.warn('[OfflineCache] IDB open failed', ev.target.error); reject(ev.target.error); };
    } catch(e) { reject(e); }
  });

  function _tx(stores, mode) {
    return _db.transaction(stores, mode || 'readonly');
  }
  function _store(name, mode) {
    return _tx([name], mode || 'readonly').objectStore(name);
  }
  function _req2p(req) {
    return new Promise(function(res, rej) {
      req.onsuccess = function() { res(req.result); };
      req.onerror   = function() { rej(req.error); };
    });
  }

  // ── Online / offline detection ─────────────────────────────────────────────
  var _listeners = [];
  var _online = navigator.onLine;
  window.addEventListener('online',  function() { _online = true;  _listeners.forEach(function(f){ f(true); }); });
  window.addEventListener('offline', function() { _online = false; _listeners.forEach(function(f){ f(false); }); });

  // ── Save a single message ──────────────────────────────────────────────────
  function saveMsg(room, msgId, msgObj) {
    if (!room || !msgId) return;
    var record = Object.assign({}, msgObj, {
      _pk:  room + '__' + msgId,
      room: room,
      ts:   msgObj.ts || msgObj.timestamp || Date.now()
    });
    _dbReady.then(function(db) {
      var tx = db.transaction('messages', 'readwrite');
      var st = tx.objectStore('messages');
      st.put(record);
      // Prune old messages over the limit
      var idx = st.index('byRoomTs');
      var range = IDBKeyRange.bound([room, 0], [room, Date.now()]);
      idx.getAll(range).onsuccess = function(ev) {
        var all = ev.target.result || [];
        if (all.length > MAX_MSGS_PER_ROOM) {
          // Sort ascending by ts, delete oldest
          all.sort(function(a,b){ return a.ts - b.ts; });
          var toDelete = all.slice(0, all.length - MAX_MSGS_PER_ROOM);
          var tx2 = db.transaction('messages', 'readwrite');
          var st2 = tx2.objectStore('messages');
          toDelete.forEach(function(m){ st2.delete(m._pk); });
        }
      };
    }).catch(function(){});
  }

  // ── Get messages for a room ───────────────────────────────────────────────
  function getMsgs(room, limit) {
    limit = limit || MAX_MSGS_PER_ROOM;
    return _dbReady.then(function(db) {
      return new Promise(function(resolve) {
        var tx  = db.transaction('messages', 'readonly');
        var idx = tx.objectStore('messages').index('byRoomTs');
        var range = IDBKeyRange.bound([room, 0], [room, Date.now() + 9e12]);
        var req = idx.getAll(range);
        req.onsuccess = function() {
          var all = req.result || [];
          all.sort(function(a,b){ return a.ts - b.ts; });
          resolve(all.slice(-limit));
        };
        req.onerror = function() { resolve([]); };
      });
    }).catch(function(){ return []; });
  }

  // ── Delete a single message from cache ────────────────────────────────────
  function deleteMsg(room, msgId) {
    _dbReady.then(function(db) {
      _req2p(db.transaction('messages','readwrite').objectStore('messages').delete(room+'__'+msgId)).catch(function(){});
    });
  }

  // ── Cache media file ───────────────────────────────────────────────────────
  function saveMedia(url) {
    if (!url || !_online) return Promise.resolve(false);
    if (!('caches' in window)) return Promise.resolve(false);
    // Don't re-cache data URIs or blob URIs
    if (/^(data|blob):/.test(url)) return Promise.resolve(false);
    return caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(url).then(function(existing) {
        if (existing) return true; // already cached
        return fetch(url, { mode: 'cors', credentials: 'omit' })
          .then(function(resp) {
            if (!resp.ok) return false;
            cache.put(url, resp.clone());
            // Track in IDB
            _dbReady.then(function(db) {
              db.transaction('media','readwrite').objectStore('media').put({ url: url, ts: Date.now() });
            });
            return true;
          })
          .catch(function() { return false; });
      });
    }).catch(function() { return false; });
  }

  // ── Get cached media URL (returns cache url or original) ─────────────────
  function getMedia(url) {
    if (!url) return Promise.resolve(url);
    if (!('caches' in window)) return Promise.resolve(url);
    return caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(url).then(function(resp) {
        return resp ? url : url; // URL is same; SW intercepts
      });
    }).catch(function() { return url; });
  }

  // ── Save batch of messages (called on initial Firebase load) ─────────────
  function saveMsgBatch(room, msgsArray) {
    if (!msgsArray || !msgsArray.length) return;
    _dbReady.then(function(db) {
      var tx = db.transaction('messages', 'readwrite');
      var st = tx.objectStore('messages');
      msgsArray.forEach(function(m) {
        if (!m._id && !m.id) return;
        var id = m._id || m.id;
        st.put(Object.assign({}, m, {
          _pk:  room + '__' + id,
          room: room,
          ts:   m.ts || m.timestamp || Date.now()
        }));
      });
    }).catch(function(){});
  }

  // ── Quota helper ──────────────────────────────────────────────────────────
  function getCacheSize() {
    if (!('caches' in window)) return Promise.resolve(0);
    if (navigator.storage && navigator.storage.estimate) {
      return navigator.storage.estimate().then(function(est) { return est.usage || 0; });
    }
    return Promise.resolve(0);
  }

  // ── Clear all offline data ────────────────────────────────────────────────
  function clearAll() {
    _dbReady.then(function(db) {
      db.transaction(['messages','media','meta'],'readwrite').objectStore('messages').clear();
    });
    if ('caches' in window) caches.delete(CACHE_NAME);
  }

  // ── Auto-cache media from a message object ────────────────────────────────
  function cacheFromMsg(msg) {
    if (msg && msg.fileUrl) saveMedia(msg.fileUrl);
    if (msg && msg.senderAvatar) saveMedia(msg.senderAvatar);
    if (msg && msg.replyTo && msg.replyTo.fileUrl) saveMedia(msg.replyTo.fileUrl);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    isOnline: function() { return _online; },
    onConnChange: function(fn) { _listeners.push(fn); },
    saveMsg: saveMsg,
    getMsgs: getMsgs,
    deleteMsg: deleteMsg,
    saveMsgBatch: saveMsgBatch,
    saveMedia: saveMedia,
    getMedia: getMedia,
    cacheFromMsg: cacheFromMsg,
    getCacheSize: getCacheSize,
    clearAll: clearAll,
    ready: _dbReady
  };
})();
