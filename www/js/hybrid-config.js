// ============================================================
// PHYSIO SUAI — Storage Config
// Auth + Realtime DB : Firebase
// File Storage       : Cloudflare R2  (aws4fetch)
// Flow: upload file → R2 → get public URL → save URL to Firebase
// ============================================================

// ─── FIREBASE ────────────────────────────────────────────────
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyA8YSCRPDDOO1aiVXdhdwBbVsosmyktZZk",
  authDomain:        "physio-suai.firebaseapp.com",
  databaseURL:       "https://physio-suai-default-rtdb.firebaseio.com",
  projectId:         "physio-suai",
  messagingSenderId: "316528709010",
  appId:             "1:316528709010:web:07fd170c8c2efeae67454b"
};

if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

var auth        = firebase.auth();
var db          = firebase.database();
var currentUser = null;

auth.onAuthStateChanged(function(user) {
  currentUser = user || null;
  if (user) {
    console.log("✅ Signed in:", user.email);
  } else {
    var p = window.location.pathname;
    var onPublic = p.includes("index.html") || p.endsWith("/") ||
                   p.endsWith("/physio-suai-complete/");
    if (!onPublic) {
      window.location.href = p.includes("/pages/") ? "../index.html" : "index.html";
    }
  }
});

// ─── CLOUDFLARE R2 ────────────────────────────────────────────
var R2_ACCOUNT_ID  = "42da38481c29c9c967c3af6ecd7e67cb";
var R2_ACCESS_KEY  = "044ac113440b8ce3e6fb549c840aa8e7";
var R2_SECRET_KEY  = "b549940c43a73c60fd18f172d6b40d56a82fcccfe3bab077cfc537d2ac00a2d9";
var R2_BUCKET      = "physio-app-files";
var R2_ENDPOINT    = "https://" + R2_ACCOUNT_ID + ".r2.cloudflarestorage.com";
var R2_PUBLIC_BASE = "https://pub-6101174a7d874fd2b23b17388abb361e.r2.dev";

var R2_MIME = {
  jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png",
  gif:"image/gif",  webp:"image/webp", svg:"image/svg+xml",
  mp4:"video/mp4",  mov:"video/quicktime", webm:"video/webm",
  mp3:"audio/mpeg", wav:"audio/wav",   ogg:"audio/ogg",
  pdf:"application/pdf",
  doc:"application/msword",
  docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls:"application/vnd.ms-excel",
  xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt:"application/vnd.ms-powerpoint",
  pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",
  apk:"application/vnd.android.package-archive",
  zip:"application/zip", aia:"application/zip",
  txt:"text/plain"
};

var R2_FORCE_DOWNLOAD = ["apk","zip","aia","doc","docx","xls","xlsx","ppt","pptx"];

// ─── AWS v4 signing — pure Web Crypto, zero dependencies ─────────────────────
async function _sign(key, msg) {
  var k = await crypto.subtle.importKey(
    'raw', typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
}
async function _sha256hex(buffer) {
  var h = await crypto.subtle.digest('SHA-256', typeof buffer === 'string' ? new TextEncoder().encode(buffer) : buffer);
  return Array.from(new Uint8Array(h)).map(function(b){ return ('0'+b.toString(16)).slice(-2); }).join('');
}
function _buf2hex(buf) {
  return Array.from(new Uint8Array(buf)).map(function(b){ return ('0'+b.toString(16)).slice(-2); }).join('');
}

// ─── Generate a pre-signed GET URL (no public access needed) ─────────────────
// host  = account-id.r2.cloudflarestorage.com
// path  = /bucket/key  (already built by uploadFile)
// ymd   = date string like 20260314
async function _signedGetUrl(host, path, ymd) {
  var region   = 'auto';
  var service  = 's3';
  var expires  = 518400; // 6 days in seconds (R2 max is 7 days)
  var datetime = ymd + 'T000000Z';
  var credScope = ymd + '/' + region + '/' + service + '/aws4_request';

  // Canonical query string — must be sorted alphabetically
  var qParts = [
    'X-Amz-Algorithm=AWS4-HMAC-SHA256',
    'X-Amz-Credential=' + encodeURIComponent(R2_ACCESS_KEY + '/' + credScope),
    'X-Amz-Date='       + datetime,
    'X-Amz-Expires='    + expires,
    'X-Amz-SignedHeaders=host'
  ].join('&');

  var canonical = [
    'GET',
    path,
    qParts,
    'host:' + host + '\n',   // canonical headers (note trailing \n)
    'host',                    // signed headers
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  var canonHash    = await _sha256hex(canonical);
  var stringToSign = 'AWS4-HMAC-SHA256\n' + datetime + '\n' + credScope + '\n' + canonHash;

  var kDate    = await _sign('AWS4' + R2_SECRET_KEY, ymd);
  var kRegion  = await _sign(kDate,    region);
  var kService = await _sign(kRegion,  service);
  var kSigning = await _sign(kService, 'aws4_request');
  var sigBuf   = await _sign(kSigning, stringToSign);
  var sig      = _buf2hex(sigBuf);

  return 'https://' + host + path + '?' + qParts + '&X-Amz-Signature=' + sig;
}

async function uploadFile(file, category) {
  try {
    var ext      = (file.name || 'file').split('.').pop().toLowerCase();
    var safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').substring(0, 80);
    var folder   = (category || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    var key      = folder + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '_' + safeName;
    var ct       = R2_MIME[ext] || file.type || 'application/octet-stream';

    // Read file once into ArrayBuffer
    var bodyBuf  = await file.arrayBuffer();

    // ── Build date/time strings ──────────────────────────────
    var now      = new Date();
    var ymd      = now.toISOString().slice(0,10).replace(/-/g,'');          // 20240314
    var hms      = now.toISOString().slice(11,19).replace(/:/g,'');         // 120000
    var datetime = ymd + 'T' + hms + 'Z';                                  // 20240314T120000Z
    var region   = 'auto';
    var service  = 's3';

    // ── Hash the body ────────────────────────────────────────
    var bodyHash = await _sha256hex(bodyBuf);

    // ── Host (path-style: endpoint without bucket for header) 
    var host     = R2_ACCOUNT_ID + '.r2.cloudflarestorage.com';
    var path     = '/' + R2_BUCKET + '/' + key;

    // ── Canonical request ────────────────────────────────────
    var canonical = [
      'PUT',
      path,
      '',   // no query string
      'content-type:' + ct + '\n' +
      'host:'          + host + '\n' +
      'x-amz-content-sha256:' + bodyHash + '\n' +
      'x-amz-date:'    + datetime + '\n',
      'content-type;host;x-amz-content-sha256;x-amz-date',
      bodyHash
    ].join('\n');

    // ── String to sign ───────────────────────────────────────
    var credScope   = ymd + '/' + region + '/' + service + '/aws4_request';
    var canonHash   = await _sha256hex(canonical);
    var stringToSign = 'AWS4-HMAC-SHA256\n' + datetime + '\n' + credScope + '\n' + canonHash;

    // ── Signing key ──────────────────────────────────────────
    var kDate    = await _sign('AWS4' + R2_SECRET_KEY, ymd);
    var kRegion  = await _sign(kDate,    region);
    var kService = await _sign(kRegion,  service);
    var kSigning = await _sign(kService, 'aws4_request');

    // ── Signature ────────────────────────────────────────────
    var sigBuf   = await _sign(kSigning, stringToSign);
    var signature = _buf2hex(sigBuf);

    // ── Authorization header ─────────────────────────────────
    var authHeader = 'AWS4-HMAC-SHA256 ' +
      'Credential=' + R2_ACCESS_KEY + '/' + credScope + ', ' +
      'SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, ' +
      'Signature=' + signature;

    var putUrl = 'https://' + host + path;

    console.log('📤 R2 uploading:', key, '| type:', ct, '| size:', Math.round(file.size/1024) + 'KB');

    var res = await fetch(putUrl, {
      method:  'PUT',
      headers: {
        'Content-Type':           ct,
        'Host':                   host,
        'x-amz-date':             datetime,
        'x-amz-content-sha256':   bodyHash,
        'Authorization':          authHeader
      },
      body: bodyBuf
    });

    if (!res.ok) {
      var errBody = await res.text();
      var code = (errBody.match(/<Code>(.*?)<\/Code>/)    || [])[1] || res.status;
      var msg  = (errBody.match(/<Message>(.*?)<\/Message>/) || [])[1] || res.statusText;
      throw new Error('R2 ' + code + ': ' + msg);
    }

    // Generate a pre-signed GET URL — works in <img>, <video>, <a> without
    // any public access config or rate-limited dev domains.
    // Valid for 6 days (R2 max is 7 days = 604800s).
    var getUrl = await _signedGetUrl(host, path, ymd);
    console.log('✅ R2 upload OK →', getUrl);
    return { success: true, url: getUrl, fileName: file.name, fileType: ct, key: key };

  } catch (err) {
    console.error('❌ R2 upload failed:', err.message);
    return { success: false, error: err.message };
  }
}


// ─── MIME HELPER (use this instead of file.type on Android) ──────────────────
// file.type is often empty "" on Android/Kodular WebView.
// Always use upload.fileType or this function.
function getMimeFromName(filename) {
  var ext = (filename || '').split('.').pop().toLowerCase();
  return R2_MIME[ext] || 'application/octet-stream';
}

// ─── DELETE FILE FROM R2 ──────────────────────────────────────────────────────
async function deleteFile(key) {
  if (!key) return;
  try {
    var now      = new Date();
    var ymd      = now.toISOString().slice(0,10).replace(/-/g,'');
    var hms      = now.toISOString().slice(11,19).replace(/:/g,'');
    var datetime = ymd + 'T' + hms + 'Z';
    var region   = 'auto';
    var service  = 's3';
    var host     = R2_ACCOUNT_ID + '.r2.cloudflarestorage.com';
    var path     = '/' + R2_BUCKET + '/' + key;
    var bodyHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA256('')

    var canonical = [
      'DELETE', path, '',
      'host:' + host + '\n' +
      'x-amz-content-sha256:' + bodyHash + '\n' +
      'x-amz-date:' + datetime + '\n',
      'host;x-amz-content-sha256;x-amz-date',
      bodyHash
    ].join('\n');

    var credScope    = ymd + '/' + region + '/' + service + '/aws4_request';
    var canonHash    = await _sha256hex(canonical);
    var stringToSign = 'AWS4-HMAC-SHA256\n' + datetime + '\n' + credScope + '\n' + canonHash;

    var kDate    = await _sign('AWS4' + R2_SECRET_KEY, ymd);
    var kRegion  = await _sign(kDate, region);
    var kService = await _sign(kRegion, service);
    var kSigning = await _sign(kService, 'aws4_request');
    var sigBuf   = await _sign(kSigning, stringToSign);
    var signature = _buf2hex(sigBuf);

    var authHeader = 'AWS4-HMAC-SHA256 ' +
      'Credential=' + R2_ACCESS_KEY + '/' + credScope + ', ' +
      'SignedHeaders=host;x-amz-content-sha256;x-amz-date, ' +
      'Signature=' + signature;

    await fetch('https://' + host + path, {
      method: 'DELETE',
      headers: {
        'Host': host,
        'x-amz-date': datetime,
        'x-amz-content-sha256': bodyHash,
        'Authorization': authHeader
      }
    });
    console.log('🗑️ R2 deleted:', key);
  } catch(err) {
    console.warn('R2 delete failed:', err.message);
  }
}

// ─── FIREBASE HELPERS ─────────────────────────────────────────
async function saveToFirebase(path, data) {
  try {
    var ref = await db.ref(path).push(data);
    return { success: true, id: ref.key };
  } catch (err) { return { success: false, error: err.message }; }
}

async function getFromFirebase(path, limit) {
  try {
    var snap = await db.ref(path).limitToLast(limit||100).once("value");
    var rows = [];
    snap.forEach(function(c){ rows.push(Object.assign({id:c.key}, c.val())); });
    return rows.reverse();
  } catch (err) { return []; }
}

async function updateFirebase(path, updates) {
  try { await db.ref(path).update(updates); return { success:true }; }
  catch (err) { return { success:false, error:err.message }; }
}

async function deleteFromFirebase(path) {
  try { await db.ref(path).remove(); return { success:true }; }
  catch (err) { return { success:false, error:err.message }; }
}

function listenToFirebase(path, callback) {
  db.ref(path).on("value", function(snap){
    var rows = [];
    snap.forEach(function(c){ rows.push(Object.assign({id:c.key}, c.val())); });
    callback(rows.reverse());
  });
}

async function getUserProfile(uid) {
  try {
    var id = uid || (currentUser && currentUser.uid);
    if (!id) return null;
    var profile = (await db.ref("users/"+id).once("value")).val();
    // Cache own profile globally so sendMessage can include senderAvatar
    if ((!uid || uid === (currentUser && currentUser.uid)) && profile) {
      window.currentUserData = profile;
    }
    return profile;
  } catch(e){ return null; }
}

async function updateUserProfile(updates) {
  try {
    if (!currentUser) return { success:false, error:"Not logged in" };
    await db.ref("users/"+currentUser.uid).update(updates);
    return { success:true };
  } catch(e){ return { success:false, error:e.message }; }
}

function sendNotification(userId, message) {
  db.ref("notifications/"+userId).push({ message, timestamp:Date.now(), read:false });
}

console.log("✅ Physio SUAI: Firebase + Cloudflare R2 ready");


// ================================================================
//  AUTO URL REFRESH — runs when a chat tab loads
//  Scans all messages in a Firebase path, finds pre-signed URLs
//  older than 5 days, regenerates them, and writes back to Firebase.
//  Call: refreshExpiredUrls('public_chat')  or  refreshExpiredUrls('chats/chatId')
// ================================================================
// ── Extract R2 key from any URL format we've ever used ──────────────────────
// Handles: pre-signed S3, pub-xxx.r2.dev, or direct endpoint URLs
function _extractKeyFromUrl(url) {
  if (!url) return null;
  try {
    var u = new URL(url);
    var p = decodeURIComponent(u.pathname); // e.g. /physio-app-files/chat/123_file.jpg
    // Strip leading /bucket-name/ or just /
    var bucket = '/' + R2_BUCKET + '/';
    if (p.startsWith(bucket)) return p.slice(bucket.length);
    // pub-xxx.r2.dev has no bucket in path — just /key
    if (p.startsWith('/')) return p.slice(1);
  } catch(e) {}
  return null;
}

async function refreshExpiredUrls(chatPath) {
  if (!db) return;
  // Refresh anything older than 5 days — gives 1 day safety buffer before 6-day expiry
  var FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
  var now = Date.now();

  try {
    var snap = await db.ref(chatPath).once('value');
    if (!snap.exists()) return;

    var toRefresh = {};
    var count     = 0;

    snap.forEach(function(child) {
      var msg = child.val();
      if (!msg || !msg.fileUrl) return; // no file at all

      // ── Determine the R2 key ──────────────────────────────────────────
      // Priority: stored fileKey > extracted from URL
      var key = msg.fileKey || _extractKeyFromUrl(msg.fileUrl);
      if (!key) return; // can't recover — skip

      // ── Decide if refresh is needed ───────────────────────────────────
      // New pre-signed URLs: use timestamp age
      // Old pub-xxx.r2.dev URLs: always refresh once (they may be broken already)
      var isOldDevUrl  = msg.fileUrl.indexOf('r2.dev') !== -1 ||
                         msg.fileUrl.indexOf('X-Amz-') === -1;
      var age          = now - (msg.timestamp || 0);
      var needsRefresh = isOldDevUrl || (age >= FIVE_DAYS_MS);
      if (!needsRefresh) return;

      toRefresh[child.key] = { msg: msg, key: key };
    });

    var msgIds = Object.keys(toRefresh);
    if (msgIds.length === 0) return;

    console.log('[R2] Refreshing', msgIds.length, 'URL(s) in', chatPath, '(includes legacy pub-dev URLs)');

    for (var i = 0; i < msgIds.length; i++) {
      var msgId  = msgIds[i];
      var item   = toRefresh[msgId];
      try {
        var host    = R2_ACCOUNT_ID + '.r2.cloudflarestorage.com';
        var path    = '/' + R2_BUCKET + '/' + item.key;
        var ymd     = new Date().toISOString().slice(0,10).replace(/-/g,'');
        var newUrl  = await _signedGetUrl(host, path, ymd);
        // Write back: update fileUrl AND save fileKey so future refreshes are faster
        await db.ref(chatPath + '/' + msgId).update({
          fileUrl: newUrl,
          fileKey: item.key   // backfill missing fileKey for old messages
        });
        count++;
      } catch(e) {
        console.warn('[R2] Could not refresh URL for', msgId, e.message);
      }
    }

    if (count > 0) console.log('[R2] ✅ Refreshed', count, 'URL(s)');

  } catch(e) {
    console.warn('[R2] refreshExpiredUrls error:', e.message);
  }
}

// ── XHR-based upload with progress callback ───────────────────────────────────
// Usage: uploadFileWithProgress(file, category, onProgress).then(res => ...)
// onProgress(percent) called 0–100 during upload
async function uploadFileWithProgress(file, category, onProgress) {
  try {
    var ext      = (file.name || 'file').split('.').pop().toLowerCase();
    var safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').substring(0, 80);
    var folder   = (category || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    var key      = folder + '/' + Date.now() + '_' + Math.random().toString(36).slice(2,8) + '_' + safeName;
    var ct       = R2_MIME[ext] || file.type || 'application/octet-stream';
    var bodyBuf  = await file.arrayBuffer();
    var now      = new Date();
    var ymd      = now.toISOString().slice(0,10).replace(/-/g,'');
    var hms      = now.toISOString().slice(11,19).replace(/:/g,'');
    var datetime = ymd + 'T' + hms + 'Z';
    var region   = 'auto', service = 's3';
    var bodyHash = await _sha256hex(bodyBuf);
    var host     = R2_ACCOUNT_ID + '.r2.cloudflarestorage.com';
    var path     = '/' + R2_BUCKET + '/' + key;
    var canonical = ['PUT',path,'',
      'content-type:'+ct+'\n'+'host:'+host+'\n'+'x-amz-content-sha256:'+bodyHash+'\n'+'x-amz-date:'+datetime+'\n',
      'content-type;host;x-amz-content-sha256;x-amz-date',bodyHash].join('\n');
    var credScope    = ymd+'/'+region+'/'+service+'/aws4_request';
    var canonHash    = await _sha256hex(canonical);
    var stringToSign = 'AWS4-HMAC-SHA256\n'+datetime+'\n'+credScope+'\n'+canonHash;
    var kDate    = await _sign('AWS4'+R2_SECRET_KEY, ymd);
    var kRegion  = await _sign(kDate, region);
    var kService = await _sign(kRegion, service);
    var kSigning = await _sign(kService, 'aws4_request');
    var sigBuf   = await _sign(kSigning, stringToSign);
    var signature = _buf2hex(sigBuf);
    var authHeader = 'AWS4-HMAC-SHA256 Credential='+R2_ACCESS_KEY+'/'+credScope+
      ', SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature='+signature;
    var putUrl = 'https://'+host+path;

    // XHR for progress tracking
    await new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('PUT', putUrl);
      xhr.setRequestHeader('Content-Type', ct);
      xhr.setRequestHeader('x-amz-date', datetime);
      xhr.setRequestHeader('x-amz-content-sha256', bodyHash);
      xhr.setRequestHeader('Authorization', authHeader);
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = function(ev) {
          if (ev.lengthComputable) onProgress(Math.round(ev.loaded / ev.total * 100));
        };
      }
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('R2 XHR ' + xhr.status));
      };
      xhr.onerror = function() { reject(new Error('R2 XHR network error')); };
      xhr.send(bodyBuf);
    });

    // Generate presigned GET URL (reuse _signedGetUrl from uploadFile)
    var newUrl = await _signedGetUrl(host, path, ymd);
    return { success: true, url: newUrl, fileKey: key, fileType: ct, fileName: file.name };
  } catch(e) {
    console.error('[R2] uploadFileWithProgress error:', e.message);
    return { success: false, error: e.message };
  }
}
