/**
 * PHYSIO SUAI – Alarm Manager v4 (Capacitor)
 * Uses @capacitor/local-notifications + FCM (phonegap-plugin-push)
 */
(function(window) {
  'use strict';

  window.AlarmManager = {

    init: function() {
      document.addEventListener('deviceready', function() {
        AlarmManager._setupFCM();
        AlarmManager._setupNotifListeners();
      }, false);
      // Also fire for Capacitor (no deviceready needed)
      if (document.readyState !== 'loading') AlarmManager._setupNotifListeners();
      else document.addEventListener('DOMContentLoaded', function(){ AlarmManager._setupNotifListeners(); });
    },

    _setupNotifListeners: function() {
      var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      if (!LN) return;
      LN.addListener('localNotificationActionPerformed', function(action) {
        var data = (action.notification && action.notification.extra) || {};
        if (data.page) try { window.location.href = data.page; } catch(e) {}
      });
      LN.addListener('localNotificationReceived', function(notif) {
        var data = (notif && notif.extra) || {};
        if (data.type === 'lecture_alarm') AlarmManager.ringAlarm(data);
      });
    },

    _setupFCM: function() {
      if (typeof PushNotification === 'undefined') return;
      var push = PushNotification.init({
        android: { senderID: '316528709010', sound: true, vibrate: true, forceShow: true, soundname: 'notification' }
      });
      push.on('registration', function(data) {
        window.FCM_TOKEN = data.registrationId;
        if (window.db && window.currentUser) {
          db.ref('fcm_tokens/'+currentUser.uid).set({ token: data.registrationId, platform:'android', updatedAt: Date.now() });
        }
      });
      push.on('notification', function(data) {
        var ex = data.additionalData || {};
        if (ex.foreground) AlarmManager.showInAppBanner(data.title, data.message, ex.page);
        if (ex.type === 'lecture_alarm') AlarmManager.ringAlarm(ex);
      });
    },

    scheduleLectureAlarm: async function(opts) {
      var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      if (!LN) { console.warn('[Alarm] LocalNotifications plugin not ready'); return null; }

      var fireAt  = opts.fireAt instanceof Date ? opts.fireAt : new Date(opts.fireAt);
      var id      = opts.id || (Date.now() % 999999);

      try {
        var perm = await LN.checkPermissions();
        if (perm.display !== 'granted') await LN.requestPermissions();

        await LN.schedule({ notifications: [{
          id:         id,
          title:      opts.title || 'Lecture Reminder',
          body:       opts.body  || 'Your scheduled lecture is starting!',
          schedule:   { at: fireAt, allowWhileIdle: true },
          sound:      'alarm',
          channelId:  'physio_alarm',
          actionTypeId: 'LECTURE_ALARM',
          extra: {
            type:       'lecture_alarm',
            lectureRef: opts.lectureRef || '',
            title:      opts.title || '',
            body:       opts.body  || '',
            page:       opts.page  || 'pages/assignment.html'
          }
        }]});

        // Save in Android AlarmManager via Java bridge for post-reboot recovery
        AlarmManager._saveAlarmPref({ id, fireAt: fireAt.getTime(), title: opts.title, body: opts.body, page: opts.page||'' });
        console.log('[Alarm] Scheduled id='+id+' at '+fireAt.toISOString());
      } catch(e) {
        console.error('[Alarm] Schedule error:', e);
        // Fallback: browser setTimeout (foreground only)
        var delay = fireAt.getTime() - Date.now();
        if (delay > 0 && delay < 86400000) {
          setTimeout(function(){ AlarmManager.ringAlarm(opts); }, delay);
        }
      }
      return id;
    },

    cancelAlarm: async function(id) {
      var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      if (LN) { try { await LN.cancel({ notifications:[{id}] }); } catch(e){} }
      try {
        var saved = JSON.parse(localStorage.getItem('_physio_alarms')||'{}');
        delete saved[id];
        localStorage.setItem('_physio_alarms', JSON.stringify(saved));
      } catch(e) {}
    },

    showChatNotification: async function(opts) {
      var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
      if (!LN) return;
      try {
        await LN.schedule({ notifications: [{
          id:        Date.now() % 99999,
          title:     opts.title || 'New Message',
          body:      opts.body  || '',
          sound:     'notification',
          channelId: 'physio_notif',
          extra:     { page: opts.page||'', chatId: opts.chatId||'' }
        }]});
      } catch(e) {}
    },

    ringAlarm: function(opts) {
      // Play via HTML5 Audio (works in foreground)
      try {
        var a = new Audio('../sounds/alarm.mp3');
        a.volume = 1; a.play().catch(function(){});
        setTimeout(function(){ try{a.pause();}catch(e){} }, 30000);
      } catch(e) {}
      AlarmManager.showInAppBanner(opts.title||'Lecture Alarm', opts.body||'Starting now!', opts.page||'');
    },

    showInAppBanner: function(title, body, page) {
      var existing = document.getElementById('_physio_banner');
      if (existing) existing.remove();

      var banner = document.createElement('div');
      banner.id = '_physio_banner';
      banner.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99999;width:92%;max-width:360px;background:linear-gradient(135deg,#1f2937,#374151);border:1px solid rgba(236,72,153,.4);border-radius:16px;padding:12px 14px;display:flex;align-items:flex-start;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:_banIn .3s ease;cursor:pointer;-webkit-tap-highlight-color:transparent';

      if (!document.getElementById('_bannerStyle')) {
        var s = document.createElement('style'); s.id='_bannerStyle';
        s.textContent = '@keyframes _banIn{from{transform:translateX(-50%) translateY(-80px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
        document.head.appendChild(s);
      }

      banner.innerHTML =
        '<div style="width:36px;height:36px;flex-shrink:0;border-radius:10px;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>' +
        '<div style="flex:1;min-width:0"><p style="color:#f9fafb;font-weight:700;font-size:13px;margin:0">'+(title||'')+'</p>' +
        '<p style="color:#9ca3af;font-size:12px;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(body||'')+'</p></div>' +
        '<button id="_bannerClose" style="background:none;border:none;color:#6b7280;cursor:pointer;padding:2px;flex-shrink:0">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';

      var closeBtn = banner.querySelector('#_bannerClose');
      if (closeBtn) closeBtn.addEventListener('click', function(e){ e.stopPropagation(); banner.remove(); });
      if (page)     banner.addEventListener('click', function(){ window.location.href = page; });
      document.body.appendChild(banner);
      setTimeout(function(){ if(banner.parentNode){ banner.style.transition='opacity .4s'; banner.style.opacity='0'; setTimeout(function(){ if(banner.parentNode) banner.remove(); },400); } }, 5000);
    },

    _saveAlarmPref: function(data) {
      try {
        var saved = JSON.parse(localStorage.getItem('_physio_alarms')||'{}');
        saved[data.id] = data;
        localStorage.setItem('_physio_alarms', JSON.stringify(saved));
        // Also write to Android SharedPreferences so BootReceiver can
        // re-schedule alarms after a phone reboot (Bug 4 fix).
        AlarmManager._syncAlarmsToNative(saved);
      } catch(e) {}
    },

    _syncAlarmsToNative: function(alarmsObj) {
      try {
        if (!window.Capacitor || !window.Capacitor.isNativePlatform || !window.Capacitor.isNativePlatform()) return;
        var plugin = window.Capacitor.Plugins && window.Capacitor.Plugins.PhysioPrefs;
        if (!plugin || !plugin.setAlarmsJson) return;
        // Convert {id: data} map to array expected by BootReceiver
        var arr = Object.values(alarmsObj || {});
        plugin.setAlarmsJson({ json: JSON.stringify(arr) }).catch(function(e){
          console.warn('[Alarm] Failed to sync alarms to SharedPreferences:', e);
        });
      } catch(e) {}
    }
  };

  // On load, sync any existing localStorage alarms to SharedPreferences
  document.addEventListener('DOMContentLoaded', function() {
    try {
      var saved = JSON.parse(localStorage.getItem('_physio_alarms')||'{}');
      if (Object.keys(saved).length > 0) AlarmManager._syncAlarmsToNative(saved);
    } catch(e) {}
  });

  AlarmManager.init();
})(window);
