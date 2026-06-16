/**
 * PHYSIO SUAI – Image Viewer + Gemini Image Analyzer
 * Uses the same API key, model & system prompt as StudyAI
 */

// ── Same API as StudyAI ─────────────────────────────────────────
var GEMINI_IMG_KEY = 'AIzaSyB9Ap4XhekePy7M3lBW6YaBmArYluK_DGc';
var GEMINI_IMG_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + GEMINI_IMG_KEY;

// ── Same system prompt as StudyAI (PHYSIO AI personality) ───────
var GEMINI_IMG_SYS = [
  'You are PHYSIO AI — the dedicated AI study assistant for physiotherapy (PT) students at SUAI Nigeria.',
  '',
  '== YOUR EXPERTISE ==',
  'You specialise EXCLUSIVELY in physiotherapy and related medical sciences:',
  '• Anatomy & Physiology (musculoskeletal, neurological, cardiorespiratory)',
  '• Kinesiology & Biomechanics (joint mechanics, gait analysis, posture)',
  '• Musculoskeletal Physiotherapy (assessment, diagnosis, treatment)',
  '• Neurological Physiotherapy (stroke, SCI, Parkinson\'s, CP)',
  '• Cardiorespiratory Physiotherapy (COPD, cardiac rehab, breathing exercises)',
  '• Paediatric & Geriatric Physiotherapy',
  '• Sports Physiotherapy & Injury Management',
  '• Electrotherapy & Physical Agents (TENS, ultrasound, diathermy, laser)',
  '• Therapeutic Exercise & Rehab (FITT, SAID, progressive overload)',
  '• Clinical Assessment (SOAP, MMT grading 0-5, goniometry, special tests)',
  '• Orthopaedic conditions, fractures, post-op rehab',
  '• Professional ethics, documentation, clinical reasoning',
  '• Nigerian healthcare system context (SUAI, ESUT, UNTH)',
  '',
  '== IMAGE ANALYSIS ==',
  'When given an image:',
  '1. If it is an exam timetable — extract all entries, sort chronologically, create a study schedule',
  '2. If it is an anatomy diagram — identify structures, label key parts, explain clinical relevance',
  '3. If it is a clinical image — describe findings, suggest assessment, discuss treatment',
  '4. If it is a textbook page — summarise key concepts, highlight exam-relevant points',
  '5. For any other image — describe clearly and relate to physio practice where possible',
  '',
  '== STYLE ==',
  '• Use **bold** for key terms, bullet points for lists',
  '• Be encouraging and supportive — Nigerian physio students work hard',
  '• Give clinical examples to make theory practical',
  '• Keep answers focused and exam-relevant',
  '• You may sprinkle Naija Pidgin for warmth e.g. "You sabi!" but keep it professional'
].join('\n');

// ── Inject CSS once ──────────────────────────────────────────────
(function() {
  if (document.getElementById('_ivCSS')) return;
  var s = document.createElement('style');
  s.id = '_ivCSS';
  s.textContent = [
    '@keyframes _ivFadeIn{from{opacity:0}to{opacity:1}}',
    '@keyframes _ivUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    /* Fullscreen */
    '._fs-viewer{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99990;background:#000;display:flex;flex-direction:column;animation:_ivFadeIn .18s ease}',
    '._fs-nav{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(0,0,0,.75);flex-shrink:0}',
    '._fs-body{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    '._fs-img{max-width:100%;max-height:100%;object-fit:contain;display:block}',
    '._fs-foot{display:flex;justify-content:space-around;padding:12px 20px 36px;background:rgba(0,0,0,.75);flex-shrink:0}',
    '._fs-action{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:none;cursor:pointer;color:#fff;font-size:12px;font-weight:500;-webkit-tap-highlight-color:transparent}',
    '._fs-ico{width:48px;height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center}',
    /* Options sheet */
    '._iv-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99992;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}',
    '._iv-sheet{width:100%;max-width:520px;background:#1a1f2e;border-radius:24px 24px 0 0;padding:12px 0 36px;animation:_ivUp .22s cubic-bezier(.34,1.1,.64,1)}',
    '._iv-handle{width:36px;height:4px;background:#374151;border-radius:2px;margin:0 auto 12px}',
    '._iv-btn{display:flex;align-items:center;gap:16px;width:100%;background:none;border:none;cursor:pointer;padding:14px 20px;color:#e9edef;font-size:15px;font-weight:500;-webkit-tap-highlight-color:transparent;text-align:left}',
    '._iv-btn:active{background:rgba(255,255,255,.07)}',
    '._iv-ico{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
    /* Gemini analyzer */
    '._gm-sheet{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99995;background:#111827;display:flex;flex-direction:column}',
    '._gm-nav{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#1a1f2e;border-bottom:1px solid #2a3942;flex-shrink:0}',
    '._gm-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
    '._gm-thumb{max-width:100%;max-height:160px;border-radius:14px;object-fit:contain;display:block;margin:0 auto 4px}',
    '._gm-foot{padding:10px 14px 32px;background:#1a1f2e;border-top:1px solid #2a3942;flex-shrink:0;display:flex;gap:8px;align-items:flex-end}',
    '._gm-inp{flex:1;background:#2a3942;border:1.5px solid #374151;border-radius:20px;padding:10px 14px;color:#fff;font-size:14px;font-family:inherit;outline:none;resize:none;max-height:100px;line-height:1.4}',
    '._gm-inp::placeholder{color:#8696a0}',
    '._gm-send{width:46px;height:46px;min-width:46px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(236,72,153,.4)}',
    '._gm-ai{background:#1f2c34;border-radius:14px 14px 14px 4px;padding:10px 14px;font-size:14px;color:#e9edef;line-height:1.55;max-width:90%;white-space:pre-wrap}',
    '._gm-user{background:linear-gradient(135deg,#9333ea,#ec4899);border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:14px;color:#fff;line-height:1.55;align-self:flex-end;max-width:90%}',
    '._gm-chips{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0}',
    '._gm-chip{background:rgba(139,92,246,.2);border:1px solid rgba(139,92,246,.4);border-radius:20px;padding:6px 14px;font-size:13px;color:#c4b5fd;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '._gm-chip:active{background:rgba(139,92,246,.45)}',
    '._dot{display:inline-flex;gap:4px;align-items:center;padding:8px 0}',
    '._dot span{width:7px;height:7px;border-radius:50%;background:#8b5cf6;animation:_dp 1.2s infinite}',
    '._dot span:nth-child(2){animation-delay:.2s}._dot span:nth-child(3){animation-delay:.4s}',
    '@keyframes _dp{0%,80%,100%{transform:scale(.55);opacity:.4}40%{transform:scale(1);opacity:1}}',
    /* Gemini badge below image */
    '._gem-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(139,92,246,.15);border:1px solid rgba(139,92,246,.3);border-radius:20px;padding:5px 12px 5px 8px;margin-top:5px;cursor:pointer;-webkit-tap-highlight-color:transparent;font-size:12px;color:#c4b5fd;font-weight:600;position:relative;z-index:30}',
    '._gem-badge:active{background:rgba(139,92,246,.35)}'
  ].join('');
  document.head.appendChild(s);
})();

var _GEM_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 C12 2 13.2 8.3 18 12 C13.2 15.7 12 22 12 22 C12 22 10.8 15.7 6 12 C10.8 8.3 12 2 12 2Z" fill="#a78bfa"/><path d="M2 12 C2 12 8.3 10.8 12 6 C15.7 10.8 22 12 22 12 C22 12 15.7 13.2 12 18 C8.3 13.2 2 12 2 12Z" fill="#60a5fa" opacity="0.9"/></svg>';
var _GEM_ICON_LG = '<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 C12 2 13.2 8.3 18 12 C13.2 15.7 12 22 12 22 C12 22 10.8 15.7 6 12 C10.8 8.3 12 2 12 2Z" fill="#a78bfa"/><path d="M2 12 C2 12 8.3 10.8 12 6 C15.7 10.8 22 12 22 12 C22 12 15.7 13.2 12 18 C8.3 13.2 2 12 2 12Z" fill="#60a5fa" opacity="0.9"/></svg>';

// ── Build image block: img + 3-dot button + Gemini badge ─────────
function buildImageHtml(url, maxW, maxH, msgId, isMine) {
  maxW = maxW || '240px'; maxH = maxH || '240px';
  var e = url.replace(/'/g, "\\'");
  var _mid = msgId || ''; var _own = isMine ? '1' : '0';
  return '<div style="display:inline-block;max-width:' + maxW + ';margin-top:6px">' +
    '<div style="position:relative;display:block">' +
      '<img src="' + url + '" style="width:100%;max-height:' + maxH + ';border-radius:10px;object-fit:cover;display:block;cursor:pointer" onclick="openFullscreen(\'' + e + '\')" loading="lazy" onerror="this.parentElement.parentElement.style.display=\'none\'">' +
      '<button onclick="event.stopPropagation();openImgOptions(\'' + e + '\',\'' + _mid + '\',' + (_own==='1') + ')" style="position:absolute;top:6px;right:6px;width:30px;height:30px;background:rgba(0,0,0,.6);border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-tap-highlight-color:transparent">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' +
      '</button>' +
    '</div>' +
    '<button class="_gem-badge" onclick="openGeminiAnalysis(\'' + e + '\')">' + _GEM_ICON + ' Ask Gemini AI</button>' +
  '</div>';
}

// Public chat variant (full width)
function buildPublicImageHtml(url, msgId, isMine) {
  var e = url.replace(/'/g, "\\'");
  var _mid = msgId || ''; var _own = isMine ? true : false;
  return '<div style="display:block;margin-top:8px">' +
    '<div style="position:relative;display:inline-block;width:100%">' +
      '<img src="' + url + '" style="border-radius:12px;max-width:100%;max-height:260px;object-fit:cover;cursor:pointer;display:block" onclick="openFullscreen(\'' + e + '\')" loading="lazy" onerror="this.parentElement.parentElement.style.display=\'none\'">' +
      '<button onclick="event.stopPropagation();openImgOptions(\'' + e + '\',\'' + _mid + '\',' + _own + ')" style="position:absolute;top:6px;right:6px;width:30px;height:30px;background:rgba(0,0,0,.6);border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-tap-highlight-color:transparent">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' +
      '</button>' +
    '</div>' +
    '<button class="_gem-badge" onclick="openGeminiAnalysis(\'' + e + '\')">' + _GEM_ICON + ' Ask Gemini AI</button>' +
  '</div>';
}

// ── Fullscreen viewer ────────────────────────────────────────────
function openFullscreen(url) {
  var old = document.getElementById('_fsV'); if (old) old.remove();
  var e = url.replace(/'/g, "\\'");
  var d = document.createElement('div');
  d.id = '_fsV'; d.className = '_fs-viewer';
  d.innerHTML =
    '<div class="_fs-nav">' +
      '<button onclick="document.getElementById(\'_fsV\').remove()" style="width:38px;height:38px;background:rgba(255,255,255,.1);border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<span style="color:rgba(255,255,255,.7);font-size:13px">Tap image to close</span>' +
      '<button onclick="openImgOptions(\'' + e + '\')" style="width:38px;height:38px;background:rgba(255,255,255,.1);border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="_fs-body" onclick="document.getElementById(\'_fsV\').remove()">' +
      '<img class="_fs-img" src="' + url + '" onclick="event.stopPropagation()">' +
    '</div>' +
    '<div class="_fs-foot">' +
      '<button class="_fs-action" onclick="_saveImg(\'' + e + '\')">' +
        '<div class="_fs-ico" style="background:#1d4ed8"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>' +
        'Save' +
      '</button>' +
      '<button class="_fs-action" onclick="document.getElementById(\'_fsV\').remove();openGeminiAnalysis(\'' + e + '\')">' +
        '<div class="_fs-ico" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)">' + _GEM_ICON_LG + '</div>' +
        'Ask Gemini' +
      '</button>' +
      '<button class="_fs-action" onclick="window.open(\'' + e + '\',\'_blank\')">' +
        '<div class="_fs-ico" style="background:#0f766e"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div>' +
        'Open' +
      '</button>' +
    '</div>';
  document.body.appendChild(d);
}

// ── 3-dot options sheet ──────────────────────────────────────────
function openImgOptions(url, msgId, isMine) {
  var old = document.getElementById('_ivOv'); if (old) { old.remove(); return; }
  var e = url.replace(/'/g, "\\'");
  var ov = document.createElement('div');
  ov.id = '_ivOv'; ov.className = '_iv-overlay';
  ov.onclick = function(ev) { if (ev.target === ov) ov.remove(); };
  ov.innerHTML =
    '<div class="_iv-sheet">' +
      '<div class="_iv-handle"></div>' +
      '<button class="_iv-btn" onclick="document.getElementById(\'_ivOv\').remove();openFullscreen(\'' + e + '\')">' +
        '<div class="_iv-ico" style="background:#1d4ed8"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>' +
        'View Fullscreen' +
      '</button>' +
      '<button class="_iv-btn" onclick="document.getElementById(\'_ivOv\').remove();_saveImg(\'' + e + '\')">' +
        '<div class="_iv-ico" style="background:#0f766e"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>' +
        'Save to Phone' +
      '</button>' +
      '<button class="_iv-btn" onclick="document.getElementById(\'_ivOv\').remove();openGeminiAnalysis(\'' + e + '\')">' +
        '<div class="_iv-ico" style="background:linear-gradient(135deg,#ec4899,#8b5cf6)">' + _GEM_ICON_LG + '</div>' +
        '<div><div style="font-weight:700">Ask Gemini AI</div><div style="font-size:12px;color:#9ca3af;margin-top:1px">Physio AI analyzes your image</div></div>' +
      '</button>' +
      // ── Cancel (left) + Delete (right) side by side ────────────────────
      '<div style="display:flex;gap:10px;padding:10px 16px 6px;border-top:1px solid rgba(255,255,255,.07)">' +
        '<button class="_iv-btn" style="flex:1;color:#6b7280;border:none;margin:0;padding:12px 0;justify-content:center;gap:8px" onclick="document.getElementById(\'_ivOv\').remove()">' +
          '<div class="_iv-ico" style="background:#374151;width:34px;height:34px;border-radius:10px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>' +
          'Cancel' +
        '</button>' +
        (isMine && msgId ?
        '<button id="_ivDelBtn" class="_iv-btn" style="flex:1;color:#f87171;border:none;margin:0;padding:12px 0;justify-content:center;gap:8px">' +
          '<div class="_iv-ico" style="background:#7f1d1d;width:34px;height:34px;border-radius:10px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></div>' +
          'Delete' +
        '</button>' : '') +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
  // Wire delete button after DOM insertion
  if (isMine && msgId) {
    var delBtn = document.getElementById('_ivDelBtn');
    if (delBtn) delBtn.onclick = function() {
      ov.remove();
      var cbs = window._vpCbs && window._vpCbs[msgId];
      if (cbs && cbs.onDelete) { cbs.onDelete(); }
      else if (typeof showToast === 'function') showToast('Deleted', 'success');
    };
  }
}

// ── Save to phone (auto-save without opening new page) ───────────
function _saveImg(url) {
  var fname = 'physio_' + Date.now() + '.jpg';
  // Try fetch+blob first (stays on page)
  fetch(url).then(function(r){ return r.blob(); }).then(function(blob){
    var bUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = bUrl; a.download = fname;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(bUrl); }, 3000);
    if(typeof showToast==='function') showToast('✅ Image saved!');
  }).catch(function(){
    // Fallback: direct link download
    var a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    if(typeof showToast==='function') showToast('✅ Saving image…');
  });
}

// ── Gemini Analyzer ──────────────────────────────────────────────
var _gmUrl = null, _gmBusy = false;

function openGeminiAnalysis(url) {
  var old = document.getElementById('_gmS'); if (old) old.remove();
  _gmUrl = url; _gmBusy = false;
  var _quizMode = false; var _quizData = null; var _quizIdx = 0; var _quizScore = 0;

  var sheet = document.createElement('div');
  sheet.id = '_gmS'; sheet.className = '_gm-sheet';
  sheet.innerHTML =
    '<div class="_gm-nav">' +
      '<button onclick="document.getElementById(\'_gmS\').remove()" style="width:38px;height:38px;background:#2a3942;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<div style="flex:1;display:flex;align-items:center;gap:10px">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center">' + _GEM_ICON_LG + '</div>' +
        '<div>' +
          '<div style="font-weight:700;font-size:15px;color:#fff">Physio AI — Image Analysis</div>' +
          '<div style="font-size:11px;color:#a78bfa">Gemini Flash · Ask · Solve · Quiz</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="_gm-body" id="_gmBody">' +
      '<img src="' + url + '" class="_gm-thumb" onerror="this.style.display=\'none\'">' +
      '<div class="_gm-ai">👋 <b>PHYSIO AI</b> here! I can read your image — past questions, diagrams, timetables, anatomy labels. Tap a button or type your question 👇</div>' +
      '<div class="_gm-chips" id="_gmChips">' +
        '<button class="_gm-chip" onclick="_gmQuick(\'Describe this image in detail\')">📋 Describe</button>' +
        '<button class="_gm-chip" onclick="_gmQuick(\'Read all text, labels and numbers in this image exactly as written\')">📝 Read text</button>' +
        '<button class="_gm-chip" onclick="_gmQuick(\'This is an exam past question. Read each question carefully and provide the correct answer with a clear explanation for each one.\')">📚 Solve past questions</button>' +
        '<button class="_gm-chip" onclick="_gmQuick(\'Identify all anatomy structures visible in this image and explain their functions\')">🦴 Anatomy</button>' +
        '<button class="_gm-chip" onclick="_gmQuick(\'This is my exam timetable. List every subject, date and time, then create a study plan counting down days from today\')">📅 Timetable</button>' +
        '<button class="_gm-chip" onclick="_gmStartQuiz()">🧠 Interactive Quiz</button>' +
        '<button class="_gm-chip" onclick="_gmQuick(\'What clinical condition or pathology does this image show? Explain diagnosis, features and treatment.\')">🏥 Clinical</button>' +
      '</div>' +
    '</div>' +
    '<div class="_gm-foot">' +
      '<textarea class="_gm-inp" id="_gmInp" rows="1" placeholder="Ask anything about this image…" ' +
        'oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,100)+\'px\'" ' +
        'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();_gmSend();}"></textarea>' +
      '<button class="_gm-send" onclick="_gmSend()">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>' +
      '</button>' +
    '</div>';

  document.body.appendChild(sheet);

  // ── Interactive Quiz ───────────────────────────────────────────────────────
  window._gmStartQuiz = function() {
    var chips = document.getElementById('_gmChips'); if (chips) chips.remove();
    var body = document.getElementById('_gmBody'); if (!body) return;
    var thinking = document.createElement('div');
    thinking.className = '_gm-ai';
    thinking.id = '_gmQuizThink';
    thinking.innerHTML = '<div class="_dot"><span></span><span></span><span></span></div> Generating quiz from this image…';
    body.appendChild(thinking);
    body.scrollTop = body.scrollHeight;
    _quizMode = true;
    _fetchBase64(url).then(function(b64Info) {
      return _gmCallAPI(
        'You are a Physio quiz master. Look at this image carefully. Generate exactly 5 multiple-choice questions based on its content (could be anatomy, past exam questions, clinical images, timetable, or any educational content). ' +
        'Respond ONLY with valid JSON in this exact format, no other text:\n' +
        '{"questions":[{"q":"Question text","options":["A) option","B) option","C) option","D) option"],"answer":"A","explanation":"Why A is correct"}]}',
        b64Info.b64, b64Info.mime
      );
    }).then(function(raw) {
      var think2 = document.getElementById('_gmQuizThink'); if (think2) think2.remove();
      try {
        var clean = raw.replace(/```json|```/g, '').trim();
        _quizData = JSON.parse(clean);
        _quizIdx = 0; _quizScore = 0;
        _gmShowQuestion();
      } catch(e) {
        var eb = document.createElement('div'); eb.className = '_gm-ai';
        eb.textContent = '⚠️ Could not generate quiz from this image. Try a clearer photo of study material.';
        body.appendChild(eb); body.scrollTop = body.scrollHeight;
      }
    }).catch(function(err) {
      var think3 = document.getElementById('_gmQuizThink'); if (think3) think3.remove();
      var eb = document.createElement('div'); eb.className = '_gm-ai';
      eb.textContent = '⚠️ Quiz error: ' + err.message;
      body.appendChild(eb);
    });
  };

  window._gmShowQuestion = function() {
    var body = document.getElementById('_gmBody'); if (!body || !_quizData) return;
    var q = _quizData.questions[_quizIdx];
    var qDiv = document.createElement('div');
    qDiv.style.cssText = 'background:#1e3a5f;border-radius:16px;padding:14px;margin:8px 0;';
    qDiv.innerHTML =
      '<div style="color:#93c5fd;font-size:11px;font-weight:700;margin-bottom:6px">Q' + (_quizIdx+1) + ' of ' + _quizData.questions.length + '</div>' +
      '<div style="color:#fff;font-size:14px;font-weight:600;margin-bottom:12px">' + q.q + '</div>' +
      q.options.map(function(opt, i) {
        return '<button id="_qOpt'+i+'" onclick="_gmPickAnswer(\''+opt[0]+'\',\''+q.answer+'\',\''+q.explanation.replace(/'/g,'`')+'\',\''+qDiv.id+'\')" ' +
          'style="display:block;width:100%;background:#2a3942;border:1.5px solid #374151;border-radius:12px;color:#e9edef;padding:10px 12px;text-align:left;font-size:13px;cursor:pointer;margin-bottom:6px;-webkit-tap-highlight-color:transparent">' +
          opt + '</button>';
      }).join('');
    qDiv.id = '_qDiv' + _quizIdx;
    body.appendChild(qDiv);
    body.scrollTop = body.scrollHeight;
  };

  window._gmPickAnswer = function(chosen, correct, explanation, divId) {
    var body = document.getElementById('_gmBody'); if (!body) return;
    // Disable all buttons in this question
    var btns = body.querySelectorAll('[id^="_qOpt"]');
    btns.forEach(function(b) { b.disabled = true; b.style.cursor = 'default'; });
    // Color correct/wrong
    btns.forEach(function(b) {
      if (b.textContent.trim()[0] === correct) {
        b.style.background = 'rgba(34,197,94,.25)'; b.style.borderColor = '#22c55e'; b.style.color = '#86efac';
      } else if (b.textContent.trim()[0] === chosen && chosen !== correct) {
        b.style.background = 'rgba(239,68,68,.25)'; b.style.borderColor = '#ef4444'; b.style.color = '#fca5a5';
      }
    });
    if (chosen === correct) _quizScore++;
    var expDiv = document.createElement('div');
    expDiv.style.cssText = 'background:#111827;border-radius:10px;padding:10px 12px;margin-top:6px;font-size:13px;color:#' + (chosen===correct?'86efac':'fca5a5') + ';border-left:3px solid #' + (chosen===correct?'22c55e':'ef4444');
    expDiv.textContent = (chosen===correct ? '✅ Correct! ' : '❌ Wrong. ') + explanation.replace(/`/g,"'");
    var qDiv = document.getElementById('_qDiv' + _quizIdx); if (qDiv) qDiv.appendChild(expDiv);
    _quizIdx++;
    if (_quizIdx < _quizData.questions.length) {
      setTimeout(_gmShowQuestion, 600);
    } else {
      var scoreDiv = document.createElement('div');
      scoreDiv.style.cssText = 'background:linear-gradient(135deg,#1e3a5f,#1a0533);border-radius:16px;padding:16px;margin:10px 0;text-align:center;border:1.5px solid #a78bfa;';
      var pct = Math.round(_quizScore/_quizData.questions.length*100);
      scoreDiv.innerHTML =
        '<div style="font-size:28px;margin-bottom:6px">' + (pct>=80?'🏆':pct>=60?'👍':'📚') + '</div>' +
        '<div style="color:#fff;font-weight:700;font-size:16px">Quiz Complete!</div>' +
        '<div style="color:#a78bfa;font-size:22px;font-weight:800;margin:6px 0">' + _quizScore + ' / ' + _quizData.questions.length + '</div>' +
        '<div style="color:#9ca3af;font-size:13px">' + (pct>=80?'Excellent! 🔥':pct>=60?'Good work! Keep studying 💪':'Keep revising — you got this! 📖') + '</div>' +
        '<button onclick="_quizIdx=0;_quizScore=0;_quizData=null;_gmStartQuiz()" style="margin-top:12px;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:12px;color:#fff;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:700">🔄 New Quiz</button>';
      body.appendChild(scoreDiv);
      body.scrollTop = body.scrollHeight;
    }
  };

  setTimeout(function() { var i = document.getElementById('_gmInp'); if (i) i.focus(); }, 350);
}

function _gmQuick(text) {
  var inp = document.getElementById('_gmInp');
  if (inp) { inp.value = text; _gmSend(); }
}

// Helper: fetch image and convert to base64
function _fetchBase64(imgUrl) {
  return fetch(imgUrl)
    .then(function(r){ return r.blob(); })
    .then(function(blob){
      return new Promise(function(res, rej){
        var r = new FileReader();
        r.onload = function(e){ res({ b64: e.target.result.split(',')[1], mime: blob.type||'image/jpeg' }); };
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
    });
}

// Helper: call Gemini API with image + prompt
function _gmCallAPI(prompt, b64, mime) {
  return fetch(GEMINI_IMG_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: GEMINI_IMG_SYS }] },
      contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: mime, data: b64 } },
        { text: prompt }
      ]}],
      generationConfig: { maxOutputTokens: 1200, temperature: 0.6 }
    })
  }).then(function(r){ return r.json(); }).then(function(data){
    if (data.candidates && data.candidates[0] && data.candidates[0].content)
      return data.candidates[0].content.parts.map(function(p){ return p.text||''; }).join('').trim();
    if (data.error) throw new Error(data.error.message);
    return 'No response 😅';
  });
}

async function _gmSend() {
  if (_gmBusy) return;
  var inp = document.getElementById('_gmInp'); if (!inp) return;
  var text = inp.value.trim(); if (!text) return;
  inp.value = ''; inp.style.height = 'auto';
  _gmBusy = true;

  var body = document.getElementById('_gmBody'); if (!body) { _gmBusy = false; return; }

  // Remove quick-prompt chips after first question
  var chips = body.querySelector('._gm-chips'); if (chips) chips.remove();

  var ub = document.createElement('div');
  ub.className = '_gm-user'; ub.textContent = text;
  body.appendChild(ub);

  var think = document.createElement('div');
  think.className = '_gm-ai';
  think.innerHTML = '<div class="_dot"><span></span><span></span><span></span></div>';
  body.appendChild(think);
  body.scrollTop = body.scrollHeight;

  try {
    var resp = await fetch(_gmUrl);
    var blob = await resp.blob();
    var b64  = await new Promise(function(res) {
      var r = new FileReader();
      r.onload = function(e) { res(e.target.result.split(',')[1]); };
      r.readAsDataURL(blob);
    });

    var apiResp = await fetch(GEMINI_IMG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GEMINI_IMG_SYS }] },
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: blob.type || 'image/jpeg', data: b64 } },
            { text: text }
          ]
        }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      })
    });

    var data = await apiResp.json();
    var reply = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts)
      ? data.candidates[0].content.parts.map(function(p){ return p.text||''; }).join('').trim()
      : (data.error ? '⚠️ ' + data.error.message : 'No response 😅 — check your connection!');

    think.remove();
    var ab = document.createElement('div');
    ab.className = '_gm-ai'; ab.textContent = reply;
    body.appendChild(ab);

  } catch(err) {
    think.remove();
    var eb = document.createElement('div');
    eb.className = '_gm-ai'; eb.textContent = '⚠️ Network error: ' + err.message;
    body.appendChild(eb);
  }

  _gmBusy = false;
  body.scrollTop = body.scrollHeight;
}

// Alias for backward compatibility
var openGeminiImgAnalysis = openGeminiAnalysis;

console.log('✅ Image Viewer + Physio AI (gemini-flash-latest) loaded');
