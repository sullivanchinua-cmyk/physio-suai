/**
 * PHYSIO SUAI – WhatsApp-Style File Preview
 * Shows a full-screen preview before sending any file.
 * Call: showFilePreview(file, onSend)
 *   onSend(file, caption) → called when user taps Send
 */

(function() {

// ── Inject styles once ──────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('_fpCSS')) return;
  var s = document.createElement('style');
  s.id = '_fpCSS';
  s.textContent = [
    '@keyframes _fpIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',
    '#_fpOverlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9950;background:#000;display:flex;flex-direction:column;animation:_fpIn .18s ease}',
    '#_fpTopBar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,.6);flex-shrink:0}',
    '#_fpMedia{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}',
    '#_fpMedia img{max-width:100%;max-height:100%;object-fit:contain}',
    '#_fpMedia video{max-width:100%;max-height:100%}',
    '#_fpDocBox{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:30px;text-align:center}',
    '#_fpDocIcon{font-size:72px}',
    '#_fpDocName{color:#fff;font-size:15px;font-weight:600;word-break:break-all;max-width:280px}',
    '#_fpDocSize{color:#9ca3af;font-size:13px}',
    '#_fpBottom{background:rgba(17,24,39,.95);padding:10px 12px 20px;flex-shrink:0;border-top:1px solid #1f2937}',
    '#_fpCapRow{display:flex;align-items:center;gap:10px}',
    '#_fpCapInput{flex:1;background:#1f2937;border:1.5px solid #374151;border-radius:24px;padding:12px 18px;color:#fff;font-size:14px;outline:none;font-family:inherit}',
    '#_fpCapInput::placeholder{color:#6b7280}',
    '#_fpSendBtn{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent}',
    '#_fpSendBtn:active{transform:scale(.92)}',
    '#_fpMeta{font-size:11px;color:#6b7280;margin-bottom:8px;padding:0 4px}'
  ].join('');
  document.head.appendChild(s);
}

// ── File type helpers ───────────────────────────────────────────
function _fileIcon(ext) {
  var icons = {
    pdf:'📄', doc:'📝', docx:'📝', xls:'📊', xlsx:'📊',
    ppt:'📋', pptx:'📋', zip:'🗜️', apk:'📦', aia:'📦',
    mp3:'🎵', wav:'🎵', ogg:'🎵', txt:'📃', csv:'📊',
    mp4:'🎬', mov:'🎬', avi:'🎬', webm:'🎬'
  };
  return icons[ext] || '📎';
}
function _fileLabel(ext) {
  var labels = {
    pdf:'PDF Document', doc:'Word Document', docx:'Word Document',
    xls:'Spreadsheet', xlsx:'Spreadsheet', ppt:'Presentation', pptx:'Presentation',
    zip:'ZIP Archive', apk:'Android App', aia:'App Inventor Project',
    mp3:'Audio File', wav:'Audio File', txt:'Text File', csv:'Spreadsheet',
    mp4:'Video', mov:'Video', webm:'Video'
  };
  return labels[ext] || 'File';
}
function _fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}

// ── Main function ───────────────────────────────────────────────
window.showFilePreview = function(file, onSend) {
  _injectStyles();

  // Remove existing
  var existing = document.getElementById('_fpOverlay');
  if (existing) existing.remove();

  var ext  = (file.name || '').split('.').pop().toLowerCase();
  var isImg   = /^image\//.test(file.type);
  var isVideo = /^video\//.test(file.type);
  var isAudio = /^audio\//.test(file.type);

  var overlay = document.createElement('div');
  overlay.id = '_fpOverlay';

  // ── Top bar ────────────────────────────────────────────────
  overlay.innerHTML =
    '<div id="_fpTopBar">' +
      '<button id="_fpClose" style="width:38px;height:38px;background:rgba(255,255,255,.12);border:none;border-radius:50%;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent">✕</button>' +
      '<span style="color:#fff;font-size:14px;font-weight:600;flex:1;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 8px">' + (file.name || 'File') + '</span>' +
      '<div style="width:38px"></div>' +
    '</div>' +

    // ── Media area ──────────────────────────────────────────
    '<div id="_fpMedia">' +
      (isImg   ? '<img id="_fpImg" src="" alt="preview">' :
       isVideo ? '<video id="_fpVid" src="" controls style="max-width:100%;max-height:100%"></video>' :
       isAudio ? '<div id="_fpDocBox"><div id="_fpDocIcon">🎵</div><div id="_fpDocName">' + file.name + '</div><div id="_fpDocSize">' + _fmtSize(file.size) + '</div><audio controls src="" id="_fpAud" style="width:90%;margin-top:12px"></audio></div>' :
       '<div id="_fpDocBox"><div id="_fpDocIcon">' + _fileIcon(ext) + '</div><div id="_fpDocName">' + file.name + '</div><div id="_fpDocSize">' + _fileLabel(ext) + ' · ' + _fmtSize(file.size) + '</div></div>') +
    '</div>' +

    // ── Bottom caption + send ───────────────────────────────
    '<div id="_fpBottom">' +
      '<div id="_fpMeta">Tap ▶ to send' + (isImg ? ' · Sending to chat' : '') + '</div>' +
      '<div id="_fpCapRow">' +
        '<input id="_fpCapInput" type="text" placeholder="Add a caption…" maxlength="300">' +
        '<button id="_fpSendBtn">' +
          '<svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  // Load file into preview using object URL
  var objUrl = URL.createObjectURL(file);
  if (isImg)   document.getElementById('_fpImg').src = objUrl;
  if (isVideo) document.getElementById('_fpVid').src = objUrl;
  if (isAudio) document.getElementById('_fpAud').src = objUrl;

  // Close
  document.getElementById('_fpClose').onclick = function() {
    URL.revokeObjectURL(objUrl);
    overlay.remove();
  };

  // Send
  document.getElementById('_fpSendBtn').onclick = function() {
    var caption = (document.getElementById('_fpCapInput').value || '').trim();
    URL.revokeObjectURL(objUrl);
    overlay.remove();
    if (onSend) onSend(file, caption);
  };

  // Enter key sends
  document.getElementById('_fpCapInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('_fpSendBtn').click();
  });
};

console.log('✅ file-preview.js ready');
})();
