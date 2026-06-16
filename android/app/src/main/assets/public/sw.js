importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

var APP_CACHE='physio-v3', MEDIA_CACHE='physio-media-v3';
var SHELL=['index.html','home.html','pages/assignment.html','pages/chatroom.html','pages/chat.html','pages/funjokes.html','pages/business.html','pages/studyai.html','pages/novel.html','pages/buybook.html','pages/music.html','pages/school.html','js/capacitor-bridge.js','js/alarm-manager.js','js/dexie-offline.js','js/background-audio.js','js/attach-menu.js','js/features.js','js/main.js','manifest.json'];

self.addEventListener('install',function(e){ e.waitUntil(caches.open(APP_CACHE).then(function(c){return c.addAll(SHELL).catch(function(){});})); self.skipWaiting(); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==APP_CACHE&&k!==MEDIA_CACHE;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();})); });
self.addEventListener('fetch',function(e){
  var url=e.request.url;
  var isMedia=/\.(mp4|webm|mov|mp3|ogg|wav|webp|jpg|jpeg|png|gif|svg)(\?|$)/i.test(url);
  if(isMedia){ e.respondWith(caches.open(MEDIA_CACHE).then(function(c){return c.match(e.request).then(function(cached){if(cached)return cached;return fetch(e.request.clone()).then(function(r){if(r&&r.ok)c.put(e.request,r.clone());return r;}).catch(function(){return new Response('',{status:503});});});})); return; }
  var isShell=/\.(html|js|css|json)(\?|$)/i.test(url)&&url.indexOf('firebasejs')===-1&&url.indexOf('tailwindcss')===-1;
  if(isShell){ e.respondWith(caches.open(APP_CACHE).then(function(c){return c.match(e.request).then(function(cached){var fp=fetch(e.request).then(function(r){if(r&&r.ok)c.put(e.request,r.clone());return r;}).catch(function(){return cached;});return cached||fp;});})); }
});

firebase.initializeApp({apiKey:'AIzaSyDXW75z9soy3vZlh3LvYi1DZJhYn1XQl-c',authDomain:'physio-suai.firebaseapp.com',databaseURL:'https://physio-suai-default-rtdb.firebaseio.com',projectId:'physio-suai',storageBucket:'physio-suai.firebasestorage.app',messagingSenderId:'316528709010',appId:'1:316528709010:android:20ec9de524ab1d0567454b'});
var messaging=firebase.messaging();
messaging.onBackgroundMessage(function(payload){
  var n=payload.notification||{},d=payload.data||{};
  self.registration.showNotification(n.title||d.title||'Physio SUAI',{body:n.body||d.body||'',icon:'icons/icon-192.png',badge:'icons/icon-96.png',tag:'physio-'+( d.type||'msg'),sound:d.type==='lecture_alarm'?'sounds/alarm.mp3':'sounds/notification.mp3',vibrate:[200,100,200],data:{page:d.page||'home.html',type:d.type||'message'}});
});
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var page=(e.notification.data||{}).page||'home.html';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){for(var i=0;i<cs.length;i++){if('focus' in cs[i]){cs[i].focus();cs[i].navigate(page);return;}}return clients.openWindow(page);}));
});
