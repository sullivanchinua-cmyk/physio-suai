/**
 * PHYSIO SUAI – Capacitor Bridge v4
 * Wraps all @capacitor/* plugins into simple global APIs.
 * Load BEFORE other feature scripts.
 */
(function(window) {
  'use strict';

  // ── Dynamically resolve Capacitor plugins ──────────────────────────────────
  function _plugin(name) {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null;
  }

  window.IS_CAPACITOR = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  window.IS_ANDROID   = window.IS_CAPACITOR && window.Capacitor.getPlatform() === 'android';

  // ── Camera (@capacitor/camera) ─────────────────────────────────────────────
  window.CordovaCamera = {
    openGallery: function() {
      var Camera = _plugin('Camera');
      if (!Camera) return Promise.reject('Camera plugin not available');
      return Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'uri',
        source: 'PHOTOS',
        saveToGallery: false
      }).then(function(r){ return { path: r.path, webPath: r.webPath }; });
    },
    openCamera: function() { /* WebRTC only — see attach-menu.js */ return Promise.reject('Use WebRTC'); }
  };

  // ── Geolocation (@capacitor/geolocation) ──────────────────────────────────
  window.CordovaGeo = {
    getCurrentPosition: function() {
      var Geo = _plugin('Geolocation');
      if (!Geo) return new Promise(function(res,rej){
        navigator.geolocation.getCurrentPosition(res,rej,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
      });
      return Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
    }
  };

  // ── Contacts (@capacitor-community/contacts) ──────────────────────────────
  window.CordovaContacts = {
    getAll: function() {
      var Contacts = _plugin('Contacts');
      if (!Contacts) return Promise.resolve([]);
      return Contacts.getContacts({
        projection: { name: true, phones: true, image: true }
      }).then(function(r){
        return (r.contacts||[]).map(function(c){
          var phone = (c.phones && c.phones[0]) ? c.phones[0].number : '';
          return {
            displayName: (c.name && c.name.display) || 'Unknown',
            phoneNumber: phone,
            photoURI: c.image && c.image.base64String
              ? 'data:image/jpeg;base64,'+c.image.base64String : null
          };
        }).filter(function(c){ return c.phoneNumber; });
      });
    }
  };

  // ── MediaStore (@odion-cloud/capacitor-mediastore) ───────────────────────
  window.CordovaMediaStore = {
    getMediasByType: function(type) {
      var MS = _plugin('CapacitorMediaStore');
      if (!MS) return Promise.resolve([]);
      return MS.getMediasByType({ mediaType: type, includeExternal: true }).then(function(r){
        return (r.medias || r.media || r.files || []).map(function(m){
          return { name: m.name||m.displayName, uri: m.uri||m.contentUri, size: m.size, dateModified: m.dateModified };
        });
      });
    }
  };

  // ── Local Notifications (@capacitor/local-notifications) ─────────────────
  window.CapLocalNotif = {
    _ch: false,
    _ensureChannel: async function() {
      if (this._ch) return;
      var LN = _plugin('LocalNotifications');
      if (!LN || !LN.createChannel) { this._ch=true; return; }
      try {
        await LN.createChannel({ id:'physio_alarm',   name:'Lecture Alarms',   importance:5, sound:'alarm',        vibration:true });
        await LN.createChannel({ id:'physio_notif',   name:'Chat Notifications',importance:4, sound:'notification', vibration:true });
        this._ch = true;
      } catch(e){}
    },
    schedule: async function(opts) {
      await this._ensureChannel();
      var LN = _plugin('LocalNotifications');
      if (!LN) return;
      var perm = await LN.checkPermissions();
      if (perm.display !== 'granted') await LN.requestPermissions();
      return LN.schedule({ notifications:[opts] });
    },
    cancel: async function(id) {
      var LN = _plugin('LocalNotifications');
      if (LN) await LN.cancel({ notifications:[{ id }] });
    }
  };

  // ── Network (@capacitor/network) ──────────────────────────────────────────
  window.CordovaNetwork = {
    isOnline: function() {
      var Net = _plugin('Network');
      if (!Net) return navigator.onLine;
      // synchronous check not possible; use cached value
      return window._capNetOnline !== undefined ? window._capNetOnline : navigator.onLine;
    },
    onStatusChange: function(cb) {
      var Net = _plugin('Network');
      if (!Net) {
        window.addEventListener('online',  function(){ cb(true);  });
        window.addEventListener('offline', function(){ cb(false); });
        return;
      }
      Net.addListener('networkStatusChange', function(s){ window._capNetOnline = s.connected; cb(s.connected); });
      Net.getStatus().then(function(s){ window._capNetOnline = s.connected; });
    }
  };

  // ── Filesystem save (@capacitor/filesystem) ───────────────────────────────
  window.saveMediaToDevice = function(base64Data, fileName, mediaType) {
    var FS = _plugin('Filesystem');
    if (!FS) return Promise.reject('Filesystem not available');
    var subDir = mediaType==='audio'    ? 'PhysioSUAI Audio'
               : mediaType==='document' ? 'PhysioSUAI Documents'
               : mediaType==='image'    ? 'PhysioSUAI Images'
               :                         'PhysioSUAI Media';
    var dir  = 'Documents/PhysioSUAI/'+subDir;
    var clean = base64Data.replace(/^data:[^;]+;base64,/,'');
    return FS.writeFile({ path: dir+'/'+fileName, data: clean, directory: 'EXTERNAL_STORAGE', recursive: true })
      .then(function(r){ return r.uri; });
  };

  // ── Android runtime permissions ───────────────────────────────────────────
  window.requestAndroidPermission = function(perm) {
    if (!window.IS_ANDROID) return Promise.resolve(true);
    var plugins = window.Capacitor && window.Capacitor.Plugins;
    // Try @capacitor/android-permissions if available
    var AP = plugins && plugins['AndroidPermissions'];
    if (AP) {
      return AP.checkPermission({ permission: perm }).then(function(r){
        if (r.granted) return true;
        return AP.requestPermission({ permission: perm }).then(function(r2){ return r2.granted; });
      }).catch(function(){ return true; });
    }
    return Promise.resolve(true);
  };

  console.log('[CapBridge] Loaded. isCapacitor='+window.IS_CAPACITOR+' isAndroid='+window.IS_ANDROID);
})(window);
