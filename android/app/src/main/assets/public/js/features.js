// Physio SUAI - Extended Features
// Chat, Business, AI, Lectures, and more

// ============================================================================
// CHAT FUNCTIONS
// ============================================================================

// ─── Helpers ─────────────────────────────────────────────────
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function scrollToPubMsg(id){
  var el = document.getElementById('pm_'+id);
  if(!el) return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  if(typeof _highlightMsg==='function'){
    _highlightMsg(el);
  } else {
    // Fallback pulse
    el.style.transition='none';
    el.style.background='linear-gradient(135deg,rgba(147,51,234,.30),rgba(236,72,153,.18))';
    el.style.borderRadius='14px';
    void el.offsetWidth;
    el.style.transition='background 0.8s ease';
    setTimeout(function(){ el.style.background=''; el.style.borderRadius=''; setTimeout(function(){el.style.transition='';},900); },650);
  }
}

// ─── Get display name from Firebase users table ───────────────
async function getSenderName() {
  if (!currentUser) return 'Anonymous';
  // Try users table first (set during signup)
  try {
    const snap = await db.ref('users/' + currentUser.uid).once('value');
    const u = snap.val();
    if (u && u.name) return u.name;
  } catch(e) {}
  // Fallback to displayName or email prefix
  if (currentUser.displayName) return currentUser.displayName;
  return currentUser.email ? currentUser.email.split('@')[0] : 'Student';
}

// ─── Telegram dust particle animation ────────────────────────
function dustDelete(el, callback) {
  if (!el) return;
  var rect = el.getBoundingClientRect();
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  // Sample pixel colors from element area
  var particles = [];
  var cols = ['#ec4899','#8b5cf6','#374151','#6b7280','#1f2937','#9ca3af'];
  for (var i = 0; i < 60; i++) {
    particles.push({
      x: rect.left + Math.random() * rect.width,
      y: rect.top  + Math.random() * rect.height,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.8) * 5,
      r: Math.random() * 4 + 1,
      alpha: 1,
      color: cols[Math.floor(Math.random() * cols.length)]
    });
  }
  // Hide element immediately
  el.style.opacity = '0';
  el.style.transition = 'none';
  var frame = 0;
  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    frame++;
    var done = true;
    particles.forEach(function(p) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.15; // gravity
      p.alpha -= 0.03;
      if (p.alpha > 0) { done = false; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
    if (!done && frame < 80) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
      if (callback) callback();
    }
  }
  requestAnimationFrame(animate);
}

// ─── Telegram-style message interaction ──────────────────────────────────────
var _ctxMenu = null;
var _ctxOverlay = null;
// Global block: when long-press fires, context popup is blocked for 1.2s
// This prevents co-joining no matter what path calls showCtxSheet
var _lpBlockCtx = 0;

// ── Multi-select mode ─────────────────────────────────────────────────────────
var _selectMode = false;
var _selectedMsgIds = new Set();
var _selectBar = null;
var _selectBotBar = null;
var _selectOnToggle = null;

function enterSelectMode(firstMsgId, callbacks) {
  if (_selectMode) { if (firstMsgId) toggleSelectMsg(firstMsgId); return; }
  closeCtxMenu(); // dismiss any open reaction/context sheet before entering select mode
  _selectMode = true;
  _selectedMsgIds = new Set();
  _selectOnToggle = callbacks || null;
  if (navigator.vibrate) navigator.vibrate(40);

  if (!document.getElementById('_selStyle')) {
    var ss = document.createElement('style'); ss.id = '_selStyle';
    ss.textContent =
      '@keyframes _selIn{from{opacity:0;transform:translateY(-100%)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes _selInUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}' +
      '._selCheck{position:absolute;left:6px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;border:2px solid #a78bfa;background:none;display:flex;align-items:center;justify-content:center;transition:all .15s;z-index:2;pointer-events:none;box-sizing:border-box}' +
      '[data-msgid]{position:relative;transition:background .15s}' +
      // FIX 2: Hide avatars during select mode
      'body.sel-mode .avatar{opacity:0!important;pointer-events:none!important;width:22px!important;min-width:22px!important}' +
      'body.sel-mode [data-avid]{opacity:0!important;pointer-events:none!important;width:22px!important;min-width:22px!important}' +
      /* Fix 2: block ALL child interactions (images, videos, buttons, links) in select mode */
      'body.sel-mode [data-msgid] img,' +
      'body.sel-mode [data-msgid] video,' +
      'body.sel-mode [data-msgid] audio,' +
      'body.sel-mode [data-msgid] a,' +
      'body.sel-mode [data-msgid] [onclick],' +
      'body.sel-mode [data-msgid] button:not(._selCheck)' +
      '{pointer-events:none!important;-webkit-tap-highlight-color:transparent!important}';
    document.head.appendChild(ss);
  }
  document.body.classList.add('sel-mode');

  // TOP BAR: X | count | edit pencil | copy | forward | delete
  var bar = document.createElement('div');
  _selectBar = bar;
  bar.id = '_selectBar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#1e2535;border-bottom:1.5px solid rgba(147,51,234,.35);display:flex;align-items:center;padding:0 4px;height:58px;box-shadow:0 3px 20px rgba(0,0,0,.7);gap:2px;animation:_selIn .18s cubic-bezier(.4,0,.2,1)';
  bar.innerHTML =
    '<button onclick="exitSelectMode()" style="width:46px;height:46px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#e9edef;border-radius:50%;-webkit-tap-highlight-color:transparent;flex-shrink:0">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    '</button>' +
    '<span id="_selectCount" style="flex:1;color:#e9edef;font-size:16px;font-weight:700;letter-spacing:.2px">0 selected</span>' +
    '<button onclick="_selDoCopy()" title="Copy" style="width:44px;height:44px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:50%;-webkit-tap-highlight-color:transparent">' +
      '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
    '</button>' +
    '<button onclick="_selDoForward()" title="Forward" style="width:44px;height:44px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:50%;-webkit-tap-highlight-color:transparent">' +
      '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>' +
    '</button>' +
    '<button onclick="_selDoDelete()" title="Delete" style="width:44px;height:44px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:50%;-webkit-tap-highlight-color:transparent">' +
      '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>' +
    '</button>';
  document.body.appendChild(bar);

  // BOTTOM BAR: Reply ← | → Forward  (Telegram-style, overlays the input row)
  var bot = document.createElement('div');
  _selectBotBar = bot;
  bot.id = '_selectBotBar';
  bot.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#1e2535;border-top:1.5px solid rgba(147,51,234,.35);display:flex;align-items:center;height:56px;box-shadow:0 -3px 20px rgba(0,0,0,.7);animation:_selInUp .18s cubic-bezier(.4,0,.2,1)';
  bot.innerHTML =
    '<button onclick="_selDoReply()" style="flex:1;height:100%;background:none;border:none;border-right:1px solid rgba(255,255,255,.08);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;color:#a78bfa;font-size:15px;font-weight:600;-webkit-tap-highlight-color:transparent">' +
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg> Reply' +
    '</button>' +
    '<button onclick="_selDoForward()" style="flex:1;height:100%;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;color:#a78bfa;font-size:15px;font-weight:600;-webkit-tap-highlight-color:transparent">' +
      'Forward <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>' +
    '</button>';
  document.body.appendChild(bot);

  if (firstMsgId) _selectedMsgIds.add(firstMsgId);
  _refreshSelectUI();
}

function exitSelectMode() {
  _selectMode = false;
  _selectOnToggle = null;
  _selectedMsgIds.clear();
  document.body.classList.remove('sel-mode');
  if (_selectBar) { _selectBar.remove(); _selectBar = null; }
  if (_selectBotBar) { _selectBotBar.remove(); _selectBotBar = null; }
  document.querySelectorAll('._selCheck').forEach(function(el) { el.remove(); });
  document.querySelectorAll('[data-msgid]').forEach(function(el) { el.style.background = ''; });
}

function toggleSelectMsg(id) {
  if (!_selectMode) return;
  if (_selectedMsgIds.has(id)) _selectedMsgIds.delete(id);
  else _selectedMsgIds.add(id);
  if (navigator.vibrate) navigator.vibrate(12);
  _refreshSelectUI();
}

function _refreshSelectUI() {
  var count = _selectedMsgIds.size;
  var countEl = document.getElementById('_selectCount');
  if (countEl) countEl.textContent = count + ' selected';
  document.querySelectorAll('[data-msgid]').forEach(function(wrap) {
    var id = wrap.getAttribute('data-msgid');
    var cb = wrap.querySelector('._selCheck');
    if (!cb) {
      cb = document.createElement('div');
      cb.className = '_selCheck';
      wrap.appendChild(cb);
    }
    var sel = _selectedMsgIds.has(id);
    cb.style.background = sel ? 'linear-gradient(135deg,#9333ea,#ec4899)' : 'none';
    cb.style.borderColor = sel ? '#ec4899' : '#a78bfa';
    cb.innerHTML = sel ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>' : '';
    wrap.style.background = sel ? 'rgba(147,51,234,.18)' : '';
    wrap.style.borderRadius = sel ? '14px' : '';
    wrap.style.padding = sel ? '2px 4px' : '';
  });
}

function _selDoCopy() {
  var texts = [];
  _selectedMsgIds.forEach(function(id) {
    var el = document.querySelector('[data-msgid="'+id+'"]');
    if (!el) return;
    var bubble = el.querySelector('.bubble,[class*="bubble"]') || el;
    var t = (bubble.innerText || bubble.textContent || '').trim();
    if (t) texts.push(t);
  });
  if (texts.length) navigator.clipboard.writeText(texts.join('\n')).catch(function(){});
  if (typeof showToast === 'function') showToast('Copied!');
  exitSelectMode();
}
function _selDoReply() {
  var ids = Array.from(_selectedMsgIds);
  if (_selectOnToggle && _selectOnToggle.onReply) {
    _selectOnToggle.onReply(ids);
  } else if (ids.length && typeof showPubReply === 'function') {
    var el = document.querySelector('[data-msgid="'+ids[0]+'"]');
    showPubReply(ids[0],
      (el && el.getAttribute('data-sendername')) || 'Student',
      (el && el.getAttribute('data-msgtext')) || '',
      (el && el.getAttribute('data-fileurl')) || null,
      (el && el.getAttribute('data-filetype')) || null,
      false);
  }
  exitSelectMode();
}
function _selDoForward() {
  var ids = Array.from(_selectedMsgIds);
  if (_selectOnToggle && _selectOnToggle.onForward) {
    _selectOnToggle.onForward(ids);
  } else if (ids.length && typeof showForwardPicker === 'function') {
    var el = document.querySelector('[data-msgid="'+ids[0]+'"]');
    showForwardPicker(
      (el && el.getAttribute('data-msgtext')) || '',
      ids[0],
      (el && el.getAttribute('data-fileurl')) || null,
      (el && el.getAttribute('data-filetype')) || null
    );
  } else if (ids.length && typeof showForwardPickerPriv === 'function') {
    var el = document.querySelector('[data-msgid="'+ids[0]+'"]');
    showForwardPickerPriv(
      (el && el.getAttribute('data-msgtext')) || '',
      ids[0],
      (el && el.getAttribute('data-fileurl')) || null,
      (el && el.getAttribute('data-filetype')) || null
    );
  }
  exitSelectMode();
}
function _selDoDelete() {
  var ids = Array.from(_selectedMsgIds);
  if (_selectOnToggle && _selectOnToggle.onDelete) {
    _selectOnToggle.onDelete(ids);
  } else if (typeof deletePubMsg === 'function') {
    ids.forEach(function(id) { deletePubMsg(id); });
  }
  exitSelectMode();
}

// ── attachMsgInteraction — tap/long-press splitter ────────────────────────────
// Tap (< 400ms, no move) = onTap | Long press (≥ 480ms) = onLongPress
// _lpBlockCtx is set by the caller that wants to block the contextmenu fallback
function attachMsgInteraction(el, onTap, onLongPress) {
  var _lp = null, _lpAt = 0, _moved = false, _sx = 0, _sy = 0, _st = 0;

  el.addEventListener('touchstart', function(e) {
    _moved = false; _lpAt = 0; _st = Date.now();
    _sx = e.touches[0].clientX; _sy = e.touches[0].clientY;
    _lp = setTimeout(function() {
      _lpAt = Date.now();
      _lpBlockCtx = Date.now() + 1200;
      if (onLongPress) onLongPress(e);
    }, 500);
  }, { passive: true });

  el.addEventListener('touchmove', function(e) {
    // 15px threshold so slight finger tremor does not cancel long-press
    if (Math.abs(e.touches[0].clientX - _sx) > 15 || Math.abs(e.touches[0].clientY - _sy) > 15) {
      _moved = true; clearTimeout(_lp);
    }
  }, { passive: true });

  el.addEventListener('touchend', function(e) {
    clearTimeout(_lp);
    // Long press just fired: swallow touchend so it cannot act as a tap
    if (_lpAt > 0 && (Date.now() - _lpAt) < 900) { e.preventDefault(); e.stopPropagation(); return; }
    if (_moved) return;
    var held = Date.now() - _st;
    if (held < 550) {
      var _rt = e.target;
      // Let reply-strip taps scroll to original message
      var _inReply = _rt && (_rt.closest ? (_rt.closest('._replyPreview') || _rt.closest('.reply-strip')) : false);
      if (_inReply) return;
      // Let avatar taps open user profile (don't intercept with context menu)
      var _inAvatar = _rt && (_rt.closest ? _rt.closest('[onclick*="viewSenderProfile"],[onclick*="openUserProfile"],[data-avid],.avatar') : false);
      if (_inAvatar) return;
      // Let reaction pill taps toggle reactions (don't intercept)
      var _inReact = _rt && (_rt.closest ? _rt.closest('.reactions-bar') : false);
      if (_inReact) return;
      // Let Ask Gemini badge button fire its own click (don't intercept with reaction sheet)
      var _inGem = _rt && (_rt.closest ? _rt.closest('._gem-badge') : (_rt.classList && _rt.classList.contains('_gem-badge')));
      if (_inGem) return;
      // Let taps on interactive inner elements pass through (buttons, links, onclick divs inside the bubble)
      // This fixes contact "Message", event "Edit/Calendar", view-once tap, poll vote etc.
      var _inAction = _rt && (_rt.closest ? (function(){
        var p = _rt.closest('a, button, [data-passthru]');
        return p && p !== el;
      })() : false);
      if (_inAction) return;
      // Also pass through any [onclick] element inside bubble (not the outer wrapper)
      var _inOnclick = _rt && el.contains(_rt) && _rt !== el && (function(){
        var node = _rt;
        while (node && node !== el) {
          if (node.hasAttribute && node.hasAttribute('onclick')) return true;
          node = node.parentElement;
        }
        return false;
      })();
      if (_inOnclick) return;
      var msgId = el.getAttribute('data-msgid');
      if (_selectMode && msgId) {
        // In selection mode: block ALL child element interactions (videos, images, polls, etc.)
        e.preventDefault();
        e.stopPropagation();
        toggleSelectMsg(msgId);
      } else if (onTap) {
        // preventDefault kills the 300ms synthetic click that would immediately close the reaction sheet
        e.preventDefault();
        onTap(e);
      }
    }
  }, { passive: false });

  el.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if (!_selectMode && Date.now() > _lpBlockCtx && onTap) onTap(e);
  });
}

// Backward compat: enter select mode on long press, show context on tap
function attachLongPress(el, onLongPress) {
  attachMsgInteraction(el, onLongPress, function() {
    enterSelectMode(el.getAttribute('data-msgid') || null);
  });
}

// ── Shared SVG icons ──────────────────────────────────────────────────────────
var _IC = {
  reply:   '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  copy:    '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  edit:    '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  forward: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>',
  pin:     '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"/><polygon points="12 15 7 10 17 10"/></svg>',
  star:    '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  sticker: '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
  trash:   '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>'
};

var _QUICK_EMOJIS = ['❤️','👍','👎','🔥','🥰','👏','😁','😂','😮','😢','💯','🙏','💀','🤯','😭','🎉','👀','💪','😊','🤣'];

// ── WhatsApp-style voice note bubble ─────────────────────────────────────────
var _VN_BARS = [3,5,8,10,14,9,12,7,10,13,8,5,11,9,6,13,8,11,5,7,9,12,10,6,8,11,7,5,10,8];
function buildWaVoiceBubble(url, msgId) {
  var sid = msgId ? msgId.replace(/[^a-z0-9]/gi,'_') : ('vn_'+Date.now());
  var barsHtml = _VN_BARS.map(function(h,i){
    return '<div data-bi="'+i+'" style="width:2.5px;height:'+h+'px;background:rgba(255,255,255,.45);border-radius:2px;flex-shrink:0;transition:background .08s"></div>';
  }).join('');
  return '<div class="_vnWrap" data-vnurl="'+url+'" data-vnid="'+sid+'" onclick="_waPlayVoice(this)" '+
    'style="display:flex;align-items:center;gap:8px;padding:7px 10px 7px 8px;margin-top:4px;min-width:220px;max-width:250px;cursor:pointer;-webkit-tap-highlight-color:transparent">'+
    '<button class="_vnBtn" style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;-webkit-tap-highlight-color:transparent">'+
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>'+
    '</button>'+
    '<div style="flex:1;display:flex;flex-direction:column;gap:5px;min-width:0">'+
      '<div class="_vnBars" style="display:flex;align-items:center;gap:1.5px;height:28px">'+barsHtml+'</div>'+
      '<div style="display:flex;align-items:center;gap:6px">'+
        '<span class="_vnTime" style="font-size:11px;color:rgba(255,255,255,.55);min-width:28px;font-weight:500">0:00</span>'+
        '<div style="flex:1;height:3px;background:rgba(255,255,255,.2);border-radius:2px;position:relative;cursor:pointer" onclick="event.stopPropagation()" ontouchstart="_vnScrubStart(event,this)" ontouchmove="_vnScrubMove(event,this)" ontouchend="_vnScrubEnd(event,this)">'+
          '<div class="_vnProg" style="height:100%;width:0%;background:#ec4899;border-radius:2px;pointer-events:none"></div>'+
          '<div class="_vnThumb" style="position:absolute;top:50%;right:-6px;transform:translateY(-50%);width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 4px rgba(0,0,0,.4);pointer-events:none;display:none"></div>'+
        '</div>'+
      '</div>'+
    '</div>'+
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2.2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'+
  '</div>';
}

window._waPlayVoice = function(wrap) {
  if (wrap._vnIgnore) { wrap._vnIgnore = false; return; }
  var url = wrap.dataset.vnurl;
  var btn = wrap.querySelector('._vnBtn');
  var timeEl = wrap.querySelector('._vnTime');
  var progEl = wrap.querySelector('._vnProg');
  var thumbEl = wrap.querySelector('._vnThumb');
  var bars = wrap.querySelectorAll('._vnBars [data-bi]');
  if (!url) return;
  if (!wrap._audio) {
    var a = new Audio(url);
    wrap._audio = a;
    a.addEventListener('loadedmetadata', function(){
      var d=Math.floor(a.duration||0), m=Math.floor(d/60), s=d%60;
      if(timeEl) timeEl.textContent = m+':'+(s<10?'0':'')+s;
    });
    a.addEventListener('timeupdate', function(){
      if (!a.duration) return;
      var p = a.currentTime / a.duration;
      var cur=Math.floor(a.currentTime), m=Math.floor(cur/60), s=cur%60;
      if(timeEl) timeEl.textContent = m+':'+(s<10?'0':'')+s;
      if(progEl) progEl.style.width = (p*100)+'%';
      if(thumbEl) { thumbEl.style.display='block'; thumbEl.style.left=(p*100)+'%'; }
      bars.forEach(function(b,i){ b.style.background = (i/bars.length < p) ? 'rgba(236,72,153,.9)' : 'rgba(255,255,255,.45)'; });
    });
    a.addEventListener('ended', function(){
      wrap._playing = false;
      if(btn) btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
      if(progEl) progEl.style.width='0%';
      if(thumbEl) thumbEl.style.display='none';
      bars.forEach(function(b){ b.style.background='rgba(255,255,255,.45)'; });
      var d=Math.floor(a.duration||0), m=Math.floor(d/60), s=d%60;
      if(timeEl) timeEl.textContent = m+':'+(s<10?'0':'')+s;
    });
  }
  if (wrap._playing) {
    wrap._audio.pause(); wrap._playing = false;
    if(btn) btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  } else {
    document.querySelectorAll('._vnWrap[data-playing]').forEach(function(el){
      el.removeAttribute('data-playing'); if(el._audio){el._audio.pause(); el._playing=false;}
      var b=el.querySelector('._vnBtn'); if(b) b.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    });
    wrap._audio.play().catch(function(){});
    wrap._playing = true; wrap.setAttribute('data-playing','1');
    if(btn) btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  }
};
// Scrubber touch handlers
window._vnScrubStart = function(e, track) {
  e.stopPropagation();
  var wrap = track.closest ? track.closest('._vnWrap') : null;
  if (wrap) wrap._vnIgnore = true;
  _vnSeek(e.touches[0].clientX, track);
};
window._vnScrubMove = function(e, track) {
  e.stopPropagation(); e.preventDefault();
  _vnSeek(e.touches[0].clientX, track);
};
window._vnScrubEnd = function(e, track) {
  e.stopPropagation();
  setTimeout(function(){ var w=track.closest?track.closest('._vnWrap'):null; if(w)w._vnIgnore=false; }, 150);
};
function _vnSeek(clientX, track) {
  var rect = track.getBoundingClientRect();
  var p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  var wrap = track.closest ? track.closest('._vnWrap') : null;
  if (!wrap || !wrap._audio || !wrap._audio.duration) return;
  wrap._audio.currentTime = p * wrap._audio.duration;
}

// ── Telegram-style context popup ──────────────────────────────────────────────
// config = { onEmoji:fn, actions:[{ic,lb,fn,danger}], posY:number, isMine:bool }
function showCtxSheet(config) {
  if (_selectMode) return; // never show menu while in selection mode
  if (Date.now() < _lpBlockCtx) return;
  closeCtxMenu();

  if (!document.getElementById('_ctxStyle')) {
    var st = document.createElement('style'); st.id = '_ctxStyle';
    st.textContent =
      '@keyframes _ctxPop{from{opacity:0;transform:translateX(-50%) scale(.82)}to{opacity:1;transform:translateX(-50%) scale(1)}}' +
      '@keyframes _ctxFade{from{opacity:0}to{opacity:1}}' +
      '@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}';
    document.head.appendChild(st);
  }

  // Backdrop with blur
  var ov = document.createElement('div');
  _ctxOverlay = ov;
  ov.style.cssText = 'position:fixed;inset:0;z-index:9996;background:rgba(0,0,0,.48);animation:_ctxFade .15s ease;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)';
  ov.addEventListener('click', function(ev){ if (wrap && wrap.contains(ev.target)) return; closeCtxMenu(); });
  document.body.appendChild(ov);

  // Wrapper: centered horizontally, positioned vertically near touch point
  var wrap = document.createElement('div');
  _ctxMenu = wrap;
  wrap.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);z-index:9997;display:flex;flex-direction:column;align-items:center;gap:7px;width:90%;max-width:300px;animation:_ctxPop .18s cubic-bezier(.34,1.2,.64,1)';
  wrap.addEventListener('click', function(e){ e.stopPropagation(); });

  // Vertical placement: keep popup on screen
  var posY = config.posY != null ? config.posY : (window.innerHeight * 0.42);
  var estimatedH = 48 + config.actions.length * 52;
  if (posY + estimatedH > window.innerHeight - 20) {
    posY = window.innerHeight - estimatedH - 24;
  }
  if (posY < 70) posY = 70;
  wrap.style.top = posY + 'px';

  // ── Quick reaction bar (pill) ────────────────────────────────────────────
  var pill = document.createElement('div');
  pill.style.cssText = 'display:flex;align-items:center;background:#1f2c34;border-radius:32px;padding:3px 8px;gap:0px;box-shadow:0 4px 24px rgba(0,0,0,.7);border:1px solid rgba(255,255,255,.09)';

  var quickEmojis = (_QUICK_EMOJIS).slice(0, 7);
  quickEmojis.forEach(function(em) {
    var btn = document.createElement('button');
    btn.setAttribute('data-em', em);
    btn.style.cssText = 'font-size:22px;background:none;border:none;cursor:pointer;padding:4px 4px;border-radius:50%;-webkit-tap-highlight-color:transparent;transition:transform .1s;line-height:1';
    btn.textContent = em;
    btn.addEventListener('touchstart', function(){ btn.style.transform = 'scale(1.4)'; }, { passive: true });
    btn.addEventListener('touchend', function(){
      btn.style.transform = '';
      closeCtxMenu();
      if (config.onEmoji) config.onEmoji(em);
    }, { passive: true });
    btn.addEventListener('click', function(){
      closeCtxMenu();
      if (config.onEmoji) config.onEmoji(em);
    });
    pill.appendChild(btn);
  });

  // Expand button (∨)
  var expBtn = document.createElement('button');
  expBtn.style.cssText = 'width:26px;height:26px;background:rgba(255,255,255,.1);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#9ca3af;flex-shrink:0;-webkit-tap-highlight-color:transparent;margin-left:3px';
  expBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';
  expBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    _expandEmojiInPlace(wrap, config.onEmoji);
  });
  pill.appendChild(expBtn);
  wrap.appendChild(pill);

  // ── Action card ──────────────────────────────────────────────────────────
  var card = document.createElement('div');
  card.style.cssText = 'background:#1f2c34;border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.08);width:100%';

  config.actions.forEach(function(a, i) {
    var btn = document.createElement('button');
    var notLast = i < config.actions.length - 1;
    btn.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;padding:11px 16px;background:none;border:none;cursor:pointer;' +
      (notLast ? 'border-bottom:1px solid rgba(255,255,255,.07);' : '') +
      'color:' + (a.danger ? '#f87171' : '#e9edef') + ';font-size:14.5px;font-weight:400;text-align:left;-webkit-tap-highlight-color:transparent';
    btn.innerHTML = '<span style="display:flex;align-items:center;justify-content:center;width:22px;flex-shrink:0">' + a.ic + '</span>' + a.lb;
    btn.addEventListener('touchstart', function(){ btn.style.background = 'rgba(255,255,255,.07)'; }, { passive: true });
    btn.addEventListener('touchend', function(){ btn.style.background = 'none'; }, { passive: true });
    btn.addEventListener('click', function() {
      closeCtxMenu();
      if (a.fn) a.fn();
    });
    card.appendChild(btn);
  });

  wrap.appendChild(card);
  document.body.appendChild(wrap);
}

// ── Reaction-only sheet — tap on any message shows ONLY emoji pill (no actions) ─
function showReactionOnlySheet(e, onEmoji) {
  if (_selectMode) return; // never show in selection mode
  if (Date.now() < _lpBlockCtx) return;
  closeCtxMenu();

  if (!document.getElementById('_ctxStyle')) {
    var st = document.createElement('style'); st.id = '_ctxStyle';
    st.textContent =
      '@keyframes _ctxPop{from{opacity:0;transform:translateX(-50%) scale(.82)}to{opacity:1;transform:translateX(-50%) scale(1)}}' +
      '@keyframes _ctxFade{from{opacity:0}to{opacity:1}}' +
      '@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}';
    document.head.appendChild(st);
  }

  var ov = document.createElement('div');
  _ctxOverlay = ov;
  ov.style.cssText = 'position:fixed;inset:0;z-index:9996;background:rgba(0,0,0,.45);animation:_ctxFade .15s ease;-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)';
  var _shownAt = Date.now();
  // Only close on deliberate tap (click), NOT touchend — prevents scroll-lift from closing the panel
  ov.addEventListener('click', function(ev) {
    if (Date.now() - _shownAt < 600) return;
    if (wrap && wrap.contains(ev.target)) return;
    closeCtxMenu();
  });
  document.body.appendChild(ov);

  var wrap = document.createElement('div');
  _ctxMenu = wrap;
  wrap.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);z-index:9997;display:flex;flex-direction:column;align-items:center;width:90%;max-width:320px;animation:_ctxPop .18s cubic-bezier(.34,1.2,.64,1)';
  wrap.addEventListener('click', function(e){ e.stopPropagation(); });

  // Use changedTouches (touchend) or touches (touchstart/move) or mouse clientY
  var posY = e ? (e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : (e.touches && e.touches.length ? e.touches[0].clientY : (e.clientY || null))) : null;
  if (posY != null) {
    if (posY + 60 > window.innerHeight - 20) posY = window.innerHeight - 80;
    if (posY < 70) posY = 70;
    wrap.style.top = (posY - 30) + 'px';
  } else {
    wrap.style.top = (window.innerHeight * 0.42) + 'px';
  }

  var pill = document.createElement('div');
  pill.style.cssText = 'display:flex;align-items:center;background:#1f2c34;border-radius:32px;padding:4px 10px;gap:0;box-shadow:0 4px 24px rgba(0,0,0,.75);border:1px solid rgba(255,255,255,.1)';

  _QUICK_EMOJIS.slice(0, 7).forEach(function(em) {
    var btn = document.createElement('button');
    btn.style.cssText = 'font-size:24px;background:none;border:none;cursor:pointer;padding:5px 5px;border-radius:50%;-webkit-tap-highlight-color:transparent;transition:transform .1s;line-height:1';
    btn.textContent = em;
    btn.addEventListener('touchstart', function(){ btn.style.transform = 'scale(1.45)'; }, { passive: true });
    btn.addEventListener('touchend', function(){ btn.style.transform = ''; closeCtxMenu(); if (onEmoji) onEmoji(em); }, { passive: true });
    btn.addEventListener('click', function(){ closeCtxMenu(); if (onEmoji) onEmoji(em); });
    pill.appendChild(btn);
  });

  var expBtn = document.createElement('button');
  expBtn.style.cssText = 'width:28px;height:28px;background:rgba(255,255,255,.12);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#9ca3af;flex-shrink:0;-webkit-tap-highlight-color:transparent;margin-left:4px';
  expBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';
  expBtn.addEventListener('click', function(ev) { ev.stopPropagation(); _expandEmojiInPlace(wrap, onEmoji); });
  pill.appendChild(expBtn);
  wrap.appendChild(pill);
  document.body.appendChild(wrap);
}

// ── In-place emoji expansion (Telegram style: pill grows downward) ─────────────
function _expandEmojiInPlace(wrap, onEmoji) {
  var oldPill = wrap.firstChild;
  if (!oldPill) return;

  var st = document.getElementById('_ctxStyle');
  if (st && st.textContent.indexOf('_emojiExpand') === -1) {
    st.textContent += '@keyframes _emojiExpand{from{opacity:0;transform:scaleY(.7);transform-origin:top}to{opacity:1;transform:scaleY(1);transform-origin:top}}';
  }

  var panel = document.createElement('div');
  panel.style.cssText = 'background:#1f2c34;border-radius:20px;overflow:hidden;box-shadow:0 4px 28px rgba(0,0,0,.85);border:1px solid rgba(255,255,255,.1);width:100%;animation:_emojiExpand .22s cubic-bezier(.4,0,.2,1)';
  panel.addEventListener('click', function(e){ e.stopPropagation(); });
  panel.addEventListener('touchend', function(e){ e.stopPropagation(); }, { passive:false });

  // ── Quick row ──
  var qRow = document.createElement('div');
  qRow.style.cssText = 'display:flex;align-items:center;padding:4px 8px;gap:0;border-bottom:1px solid rgba(255,255,255,.07)';
  _QUICK_EMOJIS.slice(0,7).forEach(function(em) {
    var b = document.createElement('button');
    b.style.cssText = 'font-size:22px;background:none;border:none;cursor:pointer;padding:4px 3px;border-radius:50%;-webkit-tap-highlight-color:transparent;transition:transform .1s;line-height:1;flex:1';
    b.textContent = em;
    b.addEventListener('touchstart', function(){ b.style.transform='scale(1.4)'; }, { passive:true });
    b.addEventListener('touchend', function(){ b.style.transform=''; closeCtxMenu(); if (onEmoji) onEmoji(em); }, { passive:true });
    b.addEventListener('click', function(){ closeCtxMenu(); if (onEmoji) onEmoji(em); });
    qRow.appendChild(b);
  });
  // Collapse (∧) button
  var colBtn = document.createElement('button');
  colBtn.style.cssText = 'width:26px;height:26px;background:rgba(255,255,255,.12);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#9ca3af;flex-shrink:0;-webkit-tap-highlight-color:transparent;margin-left:4px';
  colBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>';
  colBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    wrap.replaceChild(oldPill, panel);
    // readjust position back
    wrap.style.top = (wrap._origTop || wrap.style.top);
  });
  qRow.appendChild(colBtn);
  panel.appendChild(qRow);

  // ── Full emoji grid ──
  var ALL_EM = [
    '😀','😁','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😋','😛','😝','😜','🤪','😎','🤩','🥳',
    '😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳',
    '🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮',
    '😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','😈','👿','💩','💀','☠️','👻','👽','👾',
    '🤖','❤️','🔥','💯','⭐','✨','💫','🌟','💥','❗','❓','💔','🖤','💜','💙','💚','💛','🧡','❤️‍🔥',
    '👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👋','🤚','🖐️','✋',
    '🖖','💪','🦾','🙏','🫶','👐','🤲','🤝','✊','👊','💅','🤳','💅',
    '🎉','🎊','🥳','🎈','🎁','🎀','🎆','🎇','🧨','🎂','🎃','🎄','🍾','🥂','🎤','🎧','🎵','🎶','🏆','🥇','🎯'
  ];
  var grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;padding:6px;max-height:190px;overflow-y:auto;-webkit-overflow-scrolling:touch;align-content:flex-start';
  ALL_EM.forEach(function(em) {
    var b = document.createElement('button');
    b.style.cssText = 'font-size:24px;background:none;border:none;cursor:pointer;padding:5px 3px;border-radius:8px;-webkit-tap-highlight-color:transparent;flex:0 0 14.28%;text-align:center;line-height:1.1;transition:background .1s';
    b.textContent = em;
    b.addEventListener('touchstart', function(){ b.style.background='rgba(255,255,255,.1)'; }, { passive:true });
    b.addEventListener('touchend', function(){ b.style.background='none'; closeCtxMenu(); if (onEmoji) onEmoji(em); }, { passive:true });
    b.addEventListener('click', function(ev){ ev.stopPropagation(); closeCtxMenu(); if (onEmoji) onEmoji(em); });
    grid.appendChild(b);
  });
  panel.appendChild(grid);

  // Store original top, then reposition wrap so expanded panel fits on screen
  wrap._origTop = wrap.style.top;
  var expandedH = 300; // approximate height of expanded panel
  var curTop = parseInt(wrap.style.top) || (window.innerHeight * 0.42);
  if (curTop + expandedH > window.innerHeight - 20) {
    wrap.style.top = Math.max(60, window.innerHeight - expandedH - 40) + 'px';
  }

  wrap.replaceChild(panel, oldPill);

  // KEY FIX: Replace the overlay with one that only closes on a deliberate tap
  // (a click event). Scroll gestures never synthesize a click, so the panel
  // stays open while the user scrolls through all emojis. Only a tap on the
  // blurred backdrop area triggers the click → close.
  if (_ctxOverlay) {
    var _oldOv = _ctxOverlay;
    var _newOv = document.createElement('div');
    _newOv.style.cssText = _oldOv.style.cssText;
    // No touchend listener at all — prevents scroll-end from closing
    _newOv.addEventListener('click', function(ev) {
      // Close only if the click landed on the overlay backdrop, not inside the wrap
      if (!wrap || !wrap.contains(ev.target)) closeCtxMenu();
    });
    document.body.replaceChild(_newOv, _oldOv);
    _ctxOverlay = _newOv;
  }
}


// ── Full emoji grid — Telegram style: floating panel from top, with categories ─
function _showFullEmojiGrid(onEmoji) {
  closeCtxMenu();
  if (!document.getElementById('_ctxStyle')) {
    var st = document.createElement('style'); st.id = '_ctxStyle';
    st.textContent =
      '@keyframes _ctxFade{from{opacity:0}to{opacity:1}}' +
      '@keyframes _emojiDrop{from{opacity:0;transform:translateY(-18px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(st);
  }

  var ov = document.createElement('div');
  _ctxOverlay = ov;
  ov.style.cssText = 'position:fixed;inset:0;z-index:9996;background:rgba(0,0,0,.5);animation:_ctxFade .15s ease';
  ov.addEventListener('click', function(ev){ if (panel && panel.contains(ev.target)) return; closeCtxMenu(); });
  document.body.appendChild(ov);

  // Panel: floating card that covers top ~55% of screen, positioned below any nav bar
  // Matches Telegram screenshots 4/5/6 — visible from near top, chat shown below
  var panel = document.createElement('div');
  _ctxMenu = panel;
  panel.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:9997;' +
    'background:#1c2433;' +
    'border-radius:0 0 18px 18px;' +
    'box-shadow:0 6px 32px rgba(0,0,0,.85);' +
    'animation:_emojiDrop .2s cubic-bezier(.4,0,.2,1);' +
    'overflow:hidden;max-height:55vh;display:flex;flex-direction:column';
  panel.addEventListener('click', function(e){ e.stopPropagation(); });
  panel.addEventListener('touchend', function(e){ e.stopPropagation(); }, { passive: false });

  var ALL_EMOJIS = {
    'Recent':   ['❤️','👍','👎','🔥','🥰','👏','😁','😂','😮','😢','💯','🙏','💀','🤯','😭','🎉','👀','💪','😊','🤣'],
    'Smileys':  ['😀','😁','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🫣','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷'],
    'Gestures': ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👋','🤚','🖐️','✋','🖖','💪','🦾','🙏','🫶','👐','🤲','🤝','✊','👊','💅','🤳'],
    'Symbols':  ['❤️','🔥','💯','⭐','✨','💫','🌟','💥','❗','❓','‼️','⁉️','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','💔','🖤','💜','💙','💚','💛','🧡','❤️‍🔥','❤️‍🩹'],
    'Dark':     ['💀','☠️','👻','👽','👾','🤖','😈','👿','🎭','🖤','🦴','💔','⚰️','🕳️','🌑','🌚','🏴','🕷️','🔪','⚔️'],
    'Party':    ['🎉','🎊','🥳','🎈','🎁','🎀','🎆','🎇','🧨','✨','🎂','🎃','🎄','🍾','🥂','🎤','🎧','🎵','🎶','🏆','🥇','🎯']
  };

  var CATS = [
    { key:'Recent',   icon:'🕐' },
    { key:'Smileys',  icon:'😀' },
    { key:'Gestures', icon:'👍' },
    { key:'Symbols',  icon:'❤️' },
    { key:'Dark',     icon:'💀' },
    { key:'Party',    icon:'🎉' }
  ];

  var _cat = 'Recent';

  // ── Category tab row ──
  var tabRow = document.createElement('div');
  tabRow.style.cssText = 'display:flex;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:8px 6px 6px;gap:2px;border-bottom:1px solid rgba(255,255,255,.09);flex-shrink:0;background:#1c2433';
  CATS.forEach(function(c) {
    var tab = document.createElement('button');
    tab.setAttribute('data-cat', c.key);
    tab.style.cssText = 'font-size:20px;background:' + (c.key === _cat ? 'rgba(147,51,234,.4)' : 'none') + ';' +
      'border:none;cursor:pointer;padding:5px 9px;border-radius:9px;flex-shrink:0;-webkit-tap-highlight-color:transparent;transition:background .12s;line-height:1';
    tab.textContent = c.icon;
    tab.addEventListener('click', function(e) {
      e.stopPropagation();
      _cat = c.key;
      tabRow.querySelectorAll('[data-cat]').forEach(function(t) {
        t.style.background = t.getAttribute('data-cat') === _cat ? 'rgba(147,51,234,.4)' : 'none';
      });
      _renderEmojiGrid(ALL_EMOJIS[_cat] || []);
    });
    tabRow.appendChild(tab);
  });
  panel.appendChild(tabRow);

  // ── Emoji grid ──
  var grid = document.createElement('div');
  grid.id = '_emojiGrid';
  grid.style.cssText = 'display:flex;flex-wrap:wrap;padding:8px 6px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;align-content:flex-start';
  panel.appendChild(grid);

  function _renderEmojiGrid(emojis) {
    grid.innerHTML = '';
    emojis.forEach(function(em) {
      var btn = document.createElement('button');
      btn.style.cssText = 'font-size:26px;background:none;border:none;cursor:pointer;padding:7px 5px;border-radius:10px;-webkit-tap-highlight-color:transparent;flex:0 0 14.28%;text-align:center;line-height:1;transition:background .1s';
      btn.textContent = em;
      btn.addEventListener('touchstart', function(){ btn.style.background='rgba(255,255,255,.1)'; }, { passive:true });
      btn.addEventListener('touchend', function(){ btn.style.background='none'; }, { passive:true });
      btn.addEventListener('click', function(ev) {
        ev.stopPropagation();
        closeCtxMenu();
        if (onEmoji) onEmoji(em);
      });
      grid.appendChild(btn);
    });
  }

  _renderEmojiGrid(ALL_EMOJIS[_cat]);
  document.body.appendChild(panel);
}

// ── Classroom/public chat context menu ────────────────────────────────────────
function showMsgContextMenu(e, msgId, isMine, msgText, fileType) {
  if (_selectMode) return; // never show menu while in selection mode
  if (Date.now() < _lpBlockCtx) return;
  var isMedia = fileType && (fileType==='image/sticker'||fileType==='image/gif'||
                              fileType.startsWith('video/')||fileType.startsWith('audio/'));
  var acts = [];
  if (!isMedia) {
    acts.push({ic:_IC.reply,   lb:'Reply',   fn:function(){setPubReply(msgId,escMenuText(msgText,60),window._currentMsgSender||'');}});
    acts.push({ic:_IC.copy,    lb:'Copy',    fn:function(){copyMsg(escMenuText(msgText,400));}});
    if(isMine) acts.push({ic:_IC.edit, lb:'Edit Message', fn:function(){editPubMsg(msgId,msgText);}});
  }
  acts.push({ic:_IC.forward, lb:'Forward',  fn:function(){showForwardPicker(msgText||'',msgId,window._currentMsgFileUrl||null,window._currentMsgFileType||null);}});
  acts.push({ic:_IC.pin,     lb:'Pin',      fn:function(){pinPubMsg(msgId,msgText);}});
  acts.push({ic:_IC.star,    lb:'Star',     fn:function(){starPubMsg(msgId,msgText);}});
  if(isMine) acts.push({ic:_IC.trash, lb:'Delete', danger:true, fn:function(){deletePubMsg(msgId);}});

  var posY = e ? (e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : (e.touches && e.touches.length ? e.touches[0].clientY : (e.clientY || null))) : null;
  showCtxSheet({
    posY: posY,
    onEmoji: function(em){ reactMsg(msgId, em); },
    actions: acts
  });
}

function escMenuText(t, max) {
  return (t||'').substring(0, max).replace(/'/g, "’").replace(/"/g, '\"');
}

function menuItem(icon, label, action, color) {
  return '<button onclick="' + action + '" style="display:flex;align-items:center;gap:14px;width:100%;padding:14px 20px;background:none;border:none;cursor:pointer;border-bottom:1px solid rgba(55,65,81,.5);color:' + (color||'#e5e7eb') + ';font-size:15px;font-weight:500;text-align:left;-webkit-tap-highlight-color:transparent">' +
    '<span style="font-size:20px;width:28px;text-align:center">' + icon + '</span>' + label +
  '</button>';
}

function closeCtxMenu() {
  if (_ctxOverlay) { _ctxOverlay.remove(); _ctxOverlay = null; }
  if (_ctxMenu) { _ctxMenu.remove(); _ctxMenu = null; }
}

function copyMsg(text) {
  closeCtxMenu();
  navigator.clipboard.writeText(text).then(function() { showToast('Copied!'); }).catch(function(){ showToast('Copied!'); });
}

// ── Reply in public/classroom chat ───────────────────────────────────────
var _pubReply = null;
function showPubReply(msgId, senderName, text, fileUrl, fileType, viewOnce) {
  closeCtxMenu();
  _pubReply = { id: msgId, senderName: senderName, text: text||'', fileUrl: fileUrl||null, fileType: fileType||null, viewOnce: !!viewOnce };
  // Build preview label — never expose view-once content
  var _preview = viewOnce ? '🔒 View once message' :
                 fileType === 'image/sticker' ? '🎭 Sticker' :
                 fileType === 'image/gif'     ? '🎞 GIF' :
                 (fileType && fileType.startsWith('image/')) ? '📷 Photo' :
                 (fileType && fileType.startsWith('audio/')) ? '🎙 Voice note' :
                 (text || '');
  // Update the reply bar (already in DOM from home.html)
  var bar = document.getElementById('pubReplyBar');
  var nameEl = document.getElementById('pubReplyName');
  var textEl = document.getElementById('pubReplyText');
  if (bar)    bar.style.display = 'block';
  if (nameEl) nameEl.textContent = senderName || '';
  if (textEl) textEl.textContent = _preview;
  // Focus input
  var inp = document.getElementById('chatInput');
  if (inp) inp.focus();
}
// Keep old name working for context menu calls
function setPubReply(msgId, text, senderName) {
  showPubReply(msgId, senderName, text, null, null, false);
}

function clearPubReply() {
  _pubReply = null;
  var bar = document.getElementById('pubReplyBar');
  if (bar) bar.style.display = 'none';
}

// ── Edit a public chat message ─────────────────────────────────────────
function editPubMsg(msgId, currentText, editPath) {
  closeCtxMenu();
  // Remove any stale overlays
  var ex = document.getElementById('_editHdrOv'); if (ex) ex.remove();
  var ex2 = document.getElementById('_editFullPage'); if (ex2) ex2.remove();
  var bar = document.getElementById('_pubEditBar'); if (bar) bar.style.display = 'none';

  // Inject slide-up animation once
  if (!document.getElementById('_editSlideUpKf')) {
    var _kf = document.createElement('style'); _kf.id = '_editSlideUpKf';
    _kf.textContent = '@keyframes _editPageIn{from{transform:translateY(100%)}to{transform:translateY(0)}}';
    document.head.appendChild(_kf);
  }

  var pg = document.createElement('div');
  pg.id = '_editFullPage';
  pg.style.cssText = 'position:fixed;inset:0;z-index:9995;background:#0d1117;display:flex;flex-direction:column;font-family:-apple-system,sans-serif;animation:_editPageIn .25s cubic-bezier(.25,.46,.45,.94) both';

  pg.innerHTML =
    // Header bar — like WhatsApp
    '<div style="display:flex;align-items:center;gap:12px;padding:14px 14px 12px;border-bottom:1px solid #1f2937;flex-shrink:0;background:#111827">' +
      '<button onclick="cancelEditPubMsg()" style="background:none;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:6px;flex-shrink:0">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
      '</button>' +
      '<div style="font-size:18px;font-weight:800;color:#fff">Edit message</div>' +
    '</div>' +
    // Message preview — like WhatsApp (shows original bubble)
    '<div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:20px 16px;display:flex;align-items:flex-end;justify-content:flex-end">' +
      '<div style="max-width:82%;background:#2d1f4e;border-radius:18px 18px 4px 18px;padding:12px 14px;box-shadow:0 4px 20px rgba(0,0,0,.5)">' +
        '<div id="_editPagePreview" style="color:#e2e8f0;font-size:15px;line-height:1.6;white-space:pre-wrap;word-break:break-word"></div>' +
        '<div style="text-align:right;margin-top:5px"><span style="font-size:11px;color:#9ca3af">✏️ Editing…</span></div>' +
      '</div>' +
    '</div>' +
    // Input row at bottom — WhatsApp style
    '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #1f2937;background:#111827;flex-shrink:0">' +
      '<input id="_editPageInput" type="text" style="flex:1;background:#1f2937;border:none;border-radius:24px;padding:12px 18px;color:#fff;font-size:15px;outline:none;caret-color:#8b5cf6;font-family:inherit" placeholder="Edit message…">' +
      '<button id="_editPageSend" onclick="_commitEditPubMsg()" style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#ec4899);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(139,92,246,.4);flex-shrink:0">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      '</button>' +
    '</div>';

  document.body.appendChild(pg);

  // Fill in preview and input
  var prev = document.getElementById('_editPagePreview');
  if (prev) prev.textContent = currentText || '';
  var inp2 = document.getElementById('_editPageInput');
  if (inp2) {
    inp2.value = currentText || '';
    inp2.dataset.editingId = msgId;
    inp2.dataset.editingOrig = currentText || '';
    if (editPath) inp2.dataset.editPath = editPath;
    else delete inp2.dataset.editPath;
    // Allow Enter to confirm
    inp2.addEventListener('keydown', function(e){ if (e.key === 'Enter') _commitEditPubMsg(); });
    setTimeout(function(){
      inp2.focus();
      try { inp2.setSelectionRange(inp2.value.length, inp2.value.length); } catch(e){}
    }, 120);
  }
}

window._commitEditPubMsg = function() {
  var inp2 = document.getElementById('_editPageInput');
  if (!inp2) return;
  var newText = (inp2.value || '').trim();
  var eId = inp2.dataset.editingId;
  if (!newText || !eId) { cancelEditPubMsg(); return; }

  // Find which DB path to update — public_chat (home) or fun_chat (funjokes)
  // Try public_chat first (home classroom), then fun_chat
  var _db = window.db;
  if (!_db) { cancelEditPubMsg(); return; }

  var editPath = inp2.dataset.editPath || '';
  // If a specific DB path was supplied (e.g. for private E2EE: "chats/chatId")
  if (editPath) {
    _db.ref(editPath + '/' + eId).update({text: newText, edited: true, editTs: Date.now()})
      .then(function() {
        if (typeof showToast === 'function') showToast('✏️ Message updated');
        cancelEditPubMsg();
      }).catch(function() {
        if (typeof showToast === 'function') showToast('Failed to update', 'error');
      });
    return;
  }
  // Auto-detect: try public_chat → fall back to fun_chat
  _db.ref('public_chat/' + eId).once('value').then(function(snap) {
    if (snap.exists()) {
      return _db.ref('public_chat/' + eId).update({message: newText, edited: true, editTs: Date.now()});
    } else {
      return _db.ref('fun_chat/' + eId).update({text: newText, edited: true, editTs: Date.now()});
    }
  }).then(function() {
    if (typeof showToast === 'function') showToast('✏️ Message updated');
    cancelEditPubMsg();
  }).catch(function() {
    if (typeof showToast === 'function') showToast('Failed to update', 'error');
  });
};

function cancelEditPubMsg() {
  var pg = document.getElementById('_editFullPage'); if (pg) pg.remove();
  var bar = document.getElementById('_pubEditBar'); if (bar) bar.style.display = 'none';
  var hdr = document.getElementById('_editHdrOv'); if (hdr) hdr.remove();
  // Also clear any editingId from main chat input
  var inp = document.getElementById('chatInput') || document.getElementById('msgInput') || document.getElementById('msgInp');
  if (inp) { inp.value = ''; delete inp.dataset.editingId; delete inp.dataset.editingOrig; }
}

// ── Forward: show user picker to forward a message to private E2EE chats ──
function showForwardPicker(text, msgId, fileUrl, fileType) {
  closeCtxMenu();
  if (!window.db || !window.currentUser) { showToast('Not signed in','error'); return; }
  var ex = document.getElementById('_fwdPickerOv');
  if (ex) { ex.remove(); return; }

  var ov = document.createElement('div');
  ov.id = '_fwdPickerOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center';
  ov.innerHTML =
    '<div style="width:100%;max-width:520px;background:#1a1f2e;border-radius:24px 24px 0 0;display:flex;flex-direction:column;max-height:80vh;padding-bottom:env(safe-area-inset-bottom);animation:sheetUp .22s cubic-bezier(.4,0,.2,1)">'+
      '<div style="display:flex;justify-content:center;padding:12px 0 4px"><div style="width:40px;height:4px;background:#374151;border-radius:2px"></div></div>'+
      '<div style="padding:14px 20px 10px;border-bottom:1px solid #374151">'+
        '<p style="color:#fff;font-weight:700;font-size:17px;margin:0 0 4px">Forward to…</p>'+
        '<input id="_fwdSearch" placeholder="Search people…" style="width:100%;background:#111827;border:none;border-radius:12px;padding:9px 14px;color:#fff;font-size:14px;outline:none;margin-top:6px" oninput="_fwdFilter(this.value)">'+
      '</div>'+
      '<div id="_fwdList" style="flex:1;overflow-y:auto;padding:8px 0"></div>'+
      '<div style="padding:12px 16px 8px;border-top:1px solid #374151;display:flex;justify-content:flex-end">'+
        '<button id="_fwdSendBtn" onclick="_doForward(\''+esc(text||'')+'\',\''+esc(msgId||'')+'\',\''+esc(fileUrl||'')+'\',\''+esc(fileType||'')+'\')" '+
          'style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(147,51,234,.5);opacity:.5;pointer-events:none">'+
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polygon points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'+
        '</button>'+
      '</div>'+
    '</div>';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);

  // Load ALL users (not just friends) so you can forward to anyone
  window._fwdSelected = new Set();
  window._fwdUsers = [];
  db.ref('users').once('value').then(function(s) {
    var users = [];
    s.forEach(function(c) {
      if (c.key === currentUser.uid) return;
      var d = c.val()||{};
      users.push({uid:c.key, name:d.name||d.displayName||c.key, photo:d.photoURL||null});
    });
    if (!users.length) {
      document.getElementById('_fwdList').innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px">No users found</p>';
      return;
    }
    users.sort(function(a,b){return a.name.localeCompare(b.name);});
    window._fwdUsers = users;
    _fwdRender(users);
  });
}
function _fwdFilter(q) {
  var filtered = (window._fwdUsers||[]).filter(function(u){ return !q || u.name.toLowerCase().includes(q.toLowerCase()); });
  _fwdRender(filtered);
}
function _fwdRender(users) {
  var list = document.getElementById('_fwdList');
  if (!list) return;
  if (!users.length) { list.innerHTML='<p style="text-align:center;color:#6b7280;padding:20px">No results</p>'; return; }
  list.innerHTML = users.map(function(u){
    var sel = window._fwdSelected && window._fwdSelected.has(u.uid);
    var initials = u.name.split(' ').map(function(w){return w[0];}).join('').substring(0,2).toUpperCase();
    return '<div onclick="_fwdToggle(\''+u.uid+'\')" data-fwd-uid="'+u.uid+'" style="display:flex;align-items:center;gap:14px;padding:12px 20px;cursor:pointer;-webkit-tap-highlight-color:transparent;background:'+(sel?'rgba(236,72,153,.1)':'none')+'">'+
      '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff;flex-shrink:0">'+
        (u.photo?'<img src="'+u.photo+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover" onerror="this.parentElement.innerHTML=\''+initials+'\'">':initials)+
      '</div>'+
      '<span style="flex:1;color:#e9edef;font-size:15px;font-weight:500">'+u.name+'</span>'+
      '<div style="width:24px;height:24px;border-radius:50%;border:2px solid '+(sel?'#ec4899':'#4b5563')+';background:'+(sel?'#ec4899':'none')+';display:flex;align-items:center;justify-content:center">'+
        (sel?'<svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>':'')+
      '</div>'+
    '</div>';
  }).join('');
}
function _fwdToggle(uid) {
  if (!window._fwdSelected) window._fwdSelected = new Set();
  if (window._fwdSelected.has(uid)) window._fwdSelected.delete(uid);
  else window._fwdSelected.add(uid);
  _fwdRender(window._fwdUsers || []);
  var btn = document.getElementById('_fwdSendBtn');
  if (btn) {
    var hasSelected = window._fwdSelected.size > 0;
    btn.style.opacity = hasSelected ? '1' : '.5';
    btn.style.pointerEvents = hasSelected ? '' : 'none';
  }
}
function _doForward(text, srcMsgId, fileUrl, fileType) {
  if (!window._fwdSelected || !window._fwdSelected.size) return;
  if (!window.currentUser || !window.db) return;
  var ov = document.getElementById('_fwdPickerOv');
  if (ov) ov.remove();

  var myUid = currentUser.uid;
  var count = 0;
  window._fwdSelected.forEach(function(uid) {
    var chatId = [myUid, uid].sort().join('_');
    var ref = db.ref('chats/' + chatId).push();
    var msgObj = {
      senderId: myUid,
      senderName: (typeof window._myProfile !== 'undefined' && window._myProfile) ? (window._myProfile.name||'') : '',
      timestamp: Date.now(),
      forwarded: true
    };
    if (fileUrl && fileType) { msgObj.fileUrl = fileUrl; msgObj.fileType = fileType; }
    if (text) msgObj.text = '↪️ ' + text;
    ref.set(msgObj);
    count++;
  });
  showToast('↪️ Forwarded to ' + count + ' person' + (count>1?'s':''));
  window._fwdSelected = new Set();
}

// ── Star in public chat ──────────────────────────────────────
var _pubStarred = new Set();
function starPubMsg(msgId, text) {
  closeCtxMenu();
  if (!currentUser) return;
  if (_pubStarred.has(msgId)) {
    db.ref('starred/' + currentUser.uid + '/public/' + msgId).remove();
    _pubStarred.delete(msgId);
    showToast('Unstarred');
  } else {
    db.ref('starred/' + currentUser.uid + '/public/' + msgId).set({ text: text, ts: Date.now() });
    _pubStarred.add(msgId);
    showToast('⭐ Starred!');
  }
}

// ── Pin in public chat ──────────────────────────────────────
function pinPubMsg(msgId, text) {
  closeCtxMenu();
  if(!currentUser) return;
  db.ref('chat_pins/public').set({msgId:msgId, text:text, ts:Date.now()}).then(function(){
    showToast('📌 Message pinned!');
    showPubPinnedBanner(text, msgId);
  });
}

function showPubPinnedBanner(text, msgId) {
  var banner = document.getElementById('pubPinnedBanner');
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'pubPinnedBanner';
    banner.style.cssText = 'background:#1e3a5f;border-bottom:1px solid #2563eb;padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:20';
    var msgs = document.getElementById('chatMessages');
    if(msgs && msgs.parentNode) msgs.parentNode.insertBefore(banner, msgs);
  }
  banner.innerHTML = '<span style="font-size:14px">📌</span><div style="flex:1"><p style="font-size:11px;color:#60a5fa;margin:0;font-weight:700">Pinned Message</p><p style="font-size:13px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">'+esc(text)+'</p></div><button onclick="scrollToPubMsg(\'' + msgId + '\')" style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:12px">Go</button>';
  banner.style.display='flex';
}

function reactMsg(msgId, emoji) {
  closeCtxMenu();
  if (!currentUser) return;
  db.ref('public_chat/' + msgId + '/reactions/' + currentUser.uid).set({
    emoji: emoji,
    name: currentUser.displayName || 'Student',
    uid: currentUser.uid
  });
}

function deletePubMsg(msgId) {
  closeCtxMenu();
  var el = document.getElementById('pm_' + msgId);
  if (!el) return;
  // Grab fileKey before removing element
  var _fk = el.getAttribute('data-filekey') || null;
  dustDelete(el, function() {
    el.remove();
    db.ref('public_chat/' + msgId).once('value').then(function(s) {
      var d = s.val() || {};
      var fileKey = _fk || d.fileKey || null;
      s.ref.remove();
      if (fileKey && typeof deleteFile === 'function') deleteFile(fileKey);
    }).catch(function(){ db.ref('public_chat/' + msgId).remove(); });
  });
}

// ─── Main sendMessage ─────────────────────────────────────────
async function sendMessage(message, fileUrl = null, fileType = null, isPrivate = false, recipientId = null, fileName = null, fileKey = null) {
  // Hard guard — never save a message with no content at all
  if (!message && !fileUrl) return { success: false, error: 'Nothing to send' };
  const chatPath = isPrivate ? `private_chats/${[currentUser.uid, recipientId].sort().join('_')}` : 'public_chat';
  const realName = await getSenderName();
  // Grab and clear reply
  var replyData = _pubReply || null;
  if (_pubReply) clearPubReply();

  const msgObj = {
    message:  message  || null,
    fileUrl:  fileUrl  || null,
    fileType: fileType || (fileUrl ? getMimeFromName(fileName||fileUrl||'') : null),
    fileName: fileName || null,
    fileKey:  fileKey || null,
    senderId: currentUser ? currentUser.uid : 'anon',
    senderName: realName,
    senderEmail: currentUser ? currentUser.email : '',
    senderAvatar: (currentUser && window.currentUserData && window.currentUserData.photoURL) ? window.currentUserData.photoURL : null,
    timestamp: Date.now(),
    reactions: {}
  };
  if (replyData) msgObj.replyTo = {
    id: replyData.id,
    senderName: replyData.senderName,
    text: replyData.viewOnce ? '' : (replyData.text || ''),  // never store VO text
    fileUrl: replyData.viewOnce ? null : (replyData.fileUrl || null),
    fileType: replyData.fileType || null,
    viewOnce: !!replyData.viewOnce
  };
  const result = await saveToFirebase(chatPath, msgObj);

  if (result.success && isPrivate) {
    sendNotification(recipientId, `New message from ${realName}`);
  }

  return result.success;
}

// ─── Public chat listener (real names + long press + reactions)
function loadPublicChat(container) {
  if (!container) return;
  if (typeof refreshExpiredUrls === 'function') {
    setTimeout(function(){ refreshExpiredUrls('public_chat'); }, 3000);
  }

  // ── Typing indicator for classroom chat ─────────────────────────────────
  var _pubTypingTimeout = null;
  var _pubChatId = 'public_classroom';
  function _pubSendTyping() {
    var user = firebase.auth().currentUser;
    if (!user) return;
    firebase.database().ref('typing/'+_pubChatId+'/'+user.uid).set({ name: user.displayName||'Someone', ts: Date.now() });
    clearTimeout(_pubTypingTimeout);
    _pubTypingTimeout = setTimeout(function() {
      firebase.database().ref('typing/'+_pubChatId+'/'+user.uid).remove();
    }, 3000);
  }
  firebase.database().ref('typing/'+_pubChatId).on('value', function(snap) {
    var user = firebase.auth().currentUser;
    var bar = document.getElementById('pubTypingBar');
    var txt = document.getElementById('pubTypingText');
    if (!bar || !txt) return;
    var typers = [];
    snap.forEach(function(c) {
      var d = c.val();
      if ((!user || c.key !== user.uid) && d && (Date.now()-d.ts) < 5000) typers.push(d.name||'Someone');
    });
    if (typers.length) {
      txt.textContent = typers[0] + (typers.length > 1 ? ' & others are' : ' is') + ' typing…';
      bar.style.display = 'block';
    } else { bar.style.display = 'none'; }
  });
  // Hook typing on the classroom input
  setTimeout(function() {
    var inp = document.getElementById('chatInput');
    if (inp && !inp._pubTypingWired) {
      inp._pubTypingWired = true;
      inp.addEventListener('input', function() { if (inp.value.trim()) _pubSendTyping(); });
    }
  }, 500);

  // ── Scroll-to-bottom for classroom chat ─────────────────────────────────
  window._classUnread = 0;
  window._classAtBottom = true;

  function _classIsAtBottom() {
    // home.html: the WINDOW scrolls, not any container div
    var scrolled = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    var totalH   = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    var viewH    = window.innerHeight || document.documentElement.clientHeight;
    return (totalH - scrolled - viewH) < 100;
  }
  function _classUpdateScrollBtn() {
    var btn   = document.getElementById('classScrollBtn');
    var badge = document.getElementById('classUnreadBadge');
    if (!btn) return;
    if (window._classAtBottom) {
      btn.style.display = 'none';
      window._classUnread = 0;
      if (badge) badge.style.display = 'none';
    } else {
      btn.style.display = 'flex';
      if (window._classUnread > 0 && badge) {
        badge.textContent = window._classUnread > 99 ? '99+' : window._classUnread;
        badge.style.display = 'flex';
      } else if (badge) { badge.style.display = 'none'; }
    }
  }
  window.classScrollToBottom = function() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    window._classUnread = 0; window._classAtBottom = true;
    _classUpdateScrollBtn();
  };
  // Listen to WINDOW scroll
  function _classOnScroll() {
    window._classAtBottom = _classIsAtBottom();
    if (window._classAtBottom) window._classUnread = 0;
    _classUpdateScrollBtn();
  }
  window.addEventListener('scroll', _classOnScroll, { passive: true });
  // Also check state 1.5s after initial load
  setTimeout(function() {
    window._classAtBottom = _classIsAtBottom();
    _classUpdateScrollBtn();
  }, 1500);

  db.ref('public_chat').limitToLast(80).on('child_added', function(snap) {
    var msg = snap.val();
    if (!msg) return;
    msg.id = snap.key;
    if (document.getElementById('pm_' + snap.key)) return;
    renderPublicMsg(msg, container);
    // Smart scroll — use window scroll since home.html body scrolls
    if (window._classAtBottom !== false) {
      setTimeout(function() {
        window.scrollTo(0, document.body.scrollHeight);
      }, 50);
    } else {
      window._classUnread = (window._classUnread || 0) + 1;
      _classUpdateScrollBtn();
    }
  });

  // Live-update own avatars in classroom when user changes their photo
  // Use Firebase listener instead of polling — fires immediately on any change
  var _classUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
  if (_classUid) {
    db.ref('users/' + _classUid + '/photoURL').on('value', function(snap) {
      var newPhoto = snap.val() || null;
      // Update window.currentUserData so other parts of app see it
      if (window.currentUserData) window.currentUserData.photoURL = newPhoto;
      // Retroactively update every avatar div for this user in classroom
      document.querySelectorAll('[data-avid="' + _classUid + '"]').forEach(function(avEl) {
        if (newPhoto) {
          avEl.style.overflow = 'hidden';
          avEl.innerHTML = '<img src="' + newPhoto + '" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentElement.textContent=\'' + (_classUid[0]||'S').toUpperCase() + '\'">';
        } else {
          avEl.style.overflow = '';
          avEl.innerHTML = (_classUid[0]||'S').toUpperCase();
        }
      });
      // Also update the nav profile button
      var navBtn = document.getElementById('profileNavBtn');
      var navInit = document.getElementById('profileInitial');
      if (navBtn && newPhoto) {
        navBtn.style.overflow = 'hidden';
        navBtn.innerHTML = '<img src="' + newPhoto + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.innerHTML=\'<span id=profileInitial>' + (_classUid[0]||'S').toUpperCase() + '</span>\'">';
      }
    });
  }

  // Listen for reactions updates
  db.ref('public_chat').on('child_changed', function(snap) {
    var msg = snap.val(); if (!msg) return; msg.id = snap.key;
    var el = document.getElementById('pm_' + snap.key);
    if (!el) return;
    // Update reactions bar
    var rEl = el.querySelector('.reactions-bar');
    if (rEl) rEl.innerHTML = buildReactionsHtml(msg.reactions, snap.key);
    // Update edited text immediately — no refresh needed
    if (msg.message !== undefined || msg.edited) {
      var txtSpan = el.querySelector('._pmtext');
      if (txtSpan && msg.message) {
        // Re-render text (plain, no special cards on edit)
        var newTxt = esc(msg.message).replace(/@(\w+)/g, function(_, n) {
          return '<span style="color:#60a5fa;font-weight:700;cursor:pointer" onclick="openPrivateChatByName(\'' + n + '\')">@' + n + '</span>';
        });
        txtSpan.innerHTML = newTxt;
        // Show or update "edited" badge in the bubble
        var bub = el.querySelector('[id^="bubble_"]');
        if (bub && msg.edited) {
          if (!bub.querySelector('._editedBadge')) {
            var badge = document.createElement('span');
            badge.className = '_editedBadge';
            badge.style.cssText = 'font-size:10px;color:#6b7280;margin-left:4px;font-style:italic';
            badge.textContent = 'edited';
            txtSpan.appendChild(badge);
          }
        }
      }
    }
  });

  // Listen for deletions
  db.ref('public_chat').on('child_removed', function(snap) {
    var el = document.getElementById('pm_' + snap.key);
    if (el) { el.style.opacity='0'; el.style.transform='scale(.9)'; el.style.transition='all .3s'; setTimeout(function(){ el.remove(); }, 300); }
  });
}

function buildReactionsHtml(reactions, msgId) {
  if (!reactions) return '';
  var counts = {};
  Object.values(reactions).forEach(function(v) {
    var em = typeof v === 'object' ? (v.emoji||'') : (typeof v === 'string' ? v : '');
    if (em && em.trim()) counts[em] = (counts[em]||0)+1;
  });
  if (!Object.keys(counts).length) return '';
  if (!window._pubReactions) window._pubReactions = {};
  window._pubReactions[msgId] = reactions;
  var myReact = currentUser && reactions[currentUser.uid];
  var myEmoji = myReact ? (typeof myReact === 'object' ? myReact.emoji : myReact) : null;
  return Object.entries(counts).map(function(kv) {
    var isMyReact = (myEmoji === kv[0]);
    var tapFn = isMyReact
      ? 'pubUnreact(\'' + msgId + '\')'
      : 'showReactionViewer(\'' + msgId + '\',\'' + kv[0] + '\')';
    return '<span onclick="' + tapFn + '" ' +
      'style="display:inline-flex;align-items:center;gap:4px;background:' + (isMyReact?'rgba(236,72,153,.25)':'#374151') + ';' +
      'border:1px solid ' + (isMyReact?'#ec4899':'#4b5563') + ';' +
      'border-radius:20px;padding:3px 10px;font-size:13px;cursor:pointer;-webkit-tap-highlight-color:transparent">' +
      kv[0] + '<span style="font-size:12px;font-weight:600;color:#d1d5db">' + kv[1] + '</span>' +
    '</span>';
  }).join('');
}
function pubUnreact(msgId) {
  if (!currentUser || !window.db) return;
  window.db.ref('public_chat/' + msgId + '/reactions/' + currentUser.uid).remove()
    .then(function(){ if (typeof showToast === 'function') showToast('Reaction removed'); })
    .catch(function(){});
}

// ── WhatsApp-style reaction viewer ───────────────────────────────────────────
function showReactionViewer(msgId, activeEmoji) {
  var reactions = window._pubReactions && window._pubReactions[msgId];
  if (!reactions) return;

  // Group reactions by emoji — handle both old string format and new {emoji,name,uid} object format
  var groups = {}; // emoji → [{uid, storedName}]
  Object.entries(reactions).forEach(function(kv) {
    var uid = kv[0], v = kv[1];
    var em = typeof v === 'object' ? (v.emoji||'') : (typeof v === 'string' ? v : '');
    var sname = typeof v === 'object' ? (v.name||v.displayName||'') : '';
    if (!em) return;
    if (!groups[em]) groups[em] = [];
    groups[em].push({uid:uid, storedName:sname});
  });

  var allEmojis = Object.keys(groups);
  var totalCount = Object.values(reactions).length;

  // Build overlay
  closeReactionViewer();
  var overlay = document.createElement('div');
  overlay.id = '_reactViewOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9990;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center';
  overlay.addEventListener('click', function(e){ if(e.target===overlay) closeReactionViewer(); });

  var panel = document.createElement('div');
  panel.style.cssText = 'background:#1a1a2e;border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:70vh;display:flex;flex-direction:column;overflow:hidden;animation:sheetUp .22s cubic-bezier(.4,0,.2,1)';

  // Tab row
  var tabs = '<div style="display:flex;border-bottom:1px solid #374151;flex-shrink:0">';
  tabs += '<button id="_rtab_all" onclick="switchReactTab(\'all\')" style="padding:12px 16px;font-size:14px;font-weight:600;background:none;border:none;cursor:pointer;color:#fff;border-bottom:2px solid #ec4899;-webkit-tap-highlight-color:transparent">All ' + totalCount + '</button>';
  allEmojis.forEach(function(em) {
    var active = (em === activeEmoji);
    tabs += '<button id="_rtab_' + em.codePointAt(0) + '" onclick="switchReactTab(\'' + em + '\')" style="padding:12px 14px;font-size:15px;font-weight:500;background:none;border:none;cursor:pointer;color:#fff;border-bottom:2px solid ' + (active?'#ec4899':'transparent') + ';-webkit-tap-highlight-color:transparent">' + em + ' ' + groups[em].length + '</button>';
  });
  tabs += '</div>';

  var listArea = '<div id="_reactList" style="overflow-y:auto;flex:1;padding:8px 0"></div>';
  var closeBtn = '<button onclick="closeReactionViewer()" style="margin:12px 16px;padding:12px;background:#374151;color:#fff;border-radius:14px;border:none;font-size:14px;font-weight:600;cursor:pointer;width:calc(100%-32px)">Close</button>';

  panel.innerHTML = '<div style="display:flex;justify-content:center;padding:10px 0 2px"><div style="width:36px;height:4px;background:#374151;border-radius:2px"></div></div>' + tabs + listArea + closeBtn;
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Store groups for tab switching
  window._reactGroups = groups;
  window._reactAllUids = Object.keys(reactions).map(function(uid) {
    var v = reactions[uid];
    return {uid:uid, em:typeof v==='object'?(v.emoji||''):v, storedName:typeof v==='object'?(v.name||v.displayName||''):''};
  });

  // Show initial tab
  renderReactTab(activeEmoji || 'all');
}

function switchReactTab(tab) {
  // Update underline
  document.querySelectorAll('[id^="_rtab_"]').forEach(function(b){ b.style.borderBottomColor='transparent'; });
  var key = tab === 'all' ? '_rtab_all' : ('_rtab_' + tab.codePointAt(0));
  var btn = document.getElementById(key);
  if (btn) btn.style.borderBottomColor = '#ec4899';
  renderReactTab(tab);
}

function renderReactTab(tab) {
  var list = document.getElementById('_reactList');
  if (!list) return;
  var items = [];
  if (tab === 'all') {
    items = window._reactAllUids || [];
  } else {
    var uids = (window._reactGroups && window._reactGroups[tab]) || [];
    items = uids.map(function(uid) { return {uid:uid, em:tab}; });
  }

  var nameMap = window._reactNameCache || {};
  window._reactNameCache = nameMap;

  // Pre-fill cache from storedName on items
  items.forEach(function(it){
    if(it.storedName && it.storedName.length > 0 && !/^[A-Za-z0-9_\-]{20,}$/.test(it.storedName))
      nameMap[it.uid] = it.storedName;
  });

  function renderItems() {
    list.innerHTML = items.map(function(it) {
      var name = nameMap[it.uid] || null;
      var _disp = name && !/^[A-Za-z0-9_\-]{20,}$/.test(name) ? name : 'Student';
      var isMe = currentUser && it.uid === currentUser.uid;
      var initial = _disp[0] ? _disp[0].toUpperCase() : 'S';
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid rgba(55,65,81,.4)">' +
        '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px;flex-shrink:0">' + initial + '</div>' +
        '<div style="flex:1"><p style="margin:0;font-size:14px;font-weight:600;color:#fff">' + (isMe ? _disp + ' (You)' : _disp) + '</p><p style="margin:0;font-size:12px;color:#6b7280">Reacted</p></div>' +
        '<span style="font-size:22px">' + it.em + '</span>' +
      '</div>';
    }).join('') || '<p style="text-align:center;color:#6b7280;padding:20px">No reactions yet</p>';
  }

  var uidsToFetch = items.map(function(it){return it.uid;}).filter(function(uid){
    var n = nameMap[uid];
    return !n || /^[A-Za-z0-9_\-]{20,}$/.test(n);
  });

  if (!uidsToFetch.length) { renderItems(); return; }

  // Fetch real names from Firebase — try displayName first, then name
  list.innerHTML = '<div style="text-align:center;padding:20px;color:#6b7280">Loading…</div>';
  var pending = uidsToFetch.length;
  uidsToFetch.forEach(function(uid) {
    db.ref('users/' + uid + '/displayName').once('value').then(function(s) {
      var dn = s.val();
      if (dn && dn.length > 0) { nameMap[uid] = dn; pending--; if(pending<=0) renderItems(); }
      else {
        db.ref('users/' + uid + '/name').once('value').then(function(s2){
          nameMap[uid] = s2.val() || 'Student';
          pending--; if(pending<=0) renderItems();
        }).catch(function(){ nameMap[uid]='Student'; pending--; if(pending<=0) renderItems(); });
      }
    }).catch(function() {
      nameMap[uid] = 'Student';
      pending--;
      if (pending <= 0) renderItems();
    });
  });
}

function closeReactionViewer() {
  var el = document.getElementById('_reactViewOverlay');
  if (el) el.remove();
}

function renderPublicMsg(msg, container) {
  // Skip truly empty messages (failed uploads that slipped through)
  // Skip truly empty messages AND old broken sticker/gif text-only entries
  if (!msg.message && !msg.text && !msg.fileUrl) return;
  // Filter out legacy sticker/gif text-only entries saved before the fix
  if (!msg.fileUrl && !msg.message && msg.text) {
    var _t = msg.text;
    if (_t.startsWith('🗒️') || /^\[GIF:/i.test(_t)) return;
  }

  // ── Offline cache: save msg + queue media caching ──────────────────────────
  if (typeof OfflineCache !== 'undefined' && msg.id) {
    OfflineCache.saveMsg('public_chat', msg.id, msg);
    OfflineCache.cacheFromMsg(msg);
  }
  var isMine = currentUser && msg.senderId === currentUser.uid;
  var isBot  = msg.isJoke || msg.senderName === '🤖 Fun Bot';
  var name   = msg.senderName || 'Student';
  var initial= isBot ? '🤖' : name[0].toUpperCase();

  // Photo cache: keyed by senderId — loaded once from Firebase users node
  if (!window._photoCache) window._photoCache = {};

  var avatarHtml;
  var senderPhoto = msg.senderAvatar || msg.senderPhoto || null;
  // Own messages: use currentUserData photo
  if (isMine && !senderPhoto && window.currentUserData && window.currentUserData.photoURL)
    senderPhoto = window.currentUserData.photoURL;
  // Check cache for others
  if (!senderPhoto && msg.senderId && window._photoCache[msg.senderId] !== undefined)
    senderPhoto = window._photoCache[msg.senderId] || null;

  if (isBot) {
    avatarHtml = '<div onclick="viewSenderProfile(\'' + msg.senderId + '\',\'' + name.replace(/\'/g,"\\'") + '\')" style="width:42px;height:42px;border-radius:50%;background:#ca8a04;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:17px;flex-shrink:0;cursor:pointer">🤖</div>';
  } else if (senderPhoto) {
    avatarHtml = '<div onclick="viewSenderProfile(\'' + msg.senderId + '\',\'' + name.replace(/\'/g,"\\'") + '\')" data-avid="' + msg.senderId + '" style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);overflow:hidden;flex-shrink:0;cursor:pointer">' +
      '<img src="' + senderPhoto + '" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentElement.textContent=\'' + initial + '\'"></div>';
  } else {
    avatarHtml = '<div onclick="viewSenderProfile(\'' + msg.senderId + '\',\'' + name.replace(/\'/g,"\\'") + '\')" data-avid="' + msg.senderId + '" style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:17px;flex-shrink:0;cursor:pointer">' + initial + '</div>';
  }

  var div = document.createElement('div');
  div.id = 'pm_' + msg.id;
  if (msg.fileKey) div.setAttribute('data-filekey', msg.fileKey);
  div.style.cssText = 'display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;transition:all .3s;' + (isBot ? 'background:rgba(234,179,8,.08);padding:10px;border-radius:14px;' : '');

  var fileHtml = '';
  if (msg.fileUrl) {
    // Derive MIME from fileType, then fileName extension, then URL's last path segment extension
    var _urlExt  = (msg.fileUrl.split('/').pop().split('?')[0].split('.').pop()||'').toLowerCase();
    var _mft     = msg.fileType || getMimeFromName(msg.fileName||'') || getMimeFromName(_urlExt ? 'f.'+_urlExt : '');
    if (_mft === 'image/sticker') {
      // Tappable sticker — opens save sheet
      var _pubIsMineStk = (typeof currentUser !== 'undefined' && currentUser && msg.senderId === currentUser.uid);
      // Register delete callback so sticker sheet delete button works
      if (!window._vpCbs) window._vpCbs = {};
      (function(_mid, _mine) {
        window._vpCbs[_mid] = { onDelete: function() { if (_mine) db.ref('public_chat/'+_mid).remove(); } };
      })(msg.id, _pubIsMineStk);
      fileHtml = (typeof buildStickerHtml === 'function')
        ? buildStickerHtml(msg.fileUrl, msg.id, msg.senderName || 'Student', _pubIsMineStk, 140)
        : '<div style="display:inline-block;margin-top:6px;position:relative"><img src="' + msg.fileUrl + '" data-orig="' + msg.fileUrl + '" style="width:140px;height:140px;object-fit:contain;display:block;filter:drop-shadow(0 2px 8px rgba(0,0,0,.4));border-radius:4px" loading="eager" onload="if(typeof _preCacheImg===\'function\')_preCacheImg(this.getAttribute(\'data-orig\')||this.src)" onerror="if(typeof _stkImgErr===\'function\')_stkImgErr(this)"></div>';
    } else if (_mft === 'image/gif' || (msg.fileUrl && msg.fileUrl.includes('giphy.com'))) {
      // ── GIF bubble: image with GIF badge ──
      fileHtml = '<div style="display:inline-block;margin-top:6px;border-radius:14px;overflow:hidden;position:relative;max-width:220px">' +
        '<img src="' + msg.fileUrl + '" data-orig="' + msg.fileUrl + '" style="width:220px;max-width:100%;max-height:180px;object-fit:cover;display:block;cursor:pointer" onclick="window.open(\'' + msg.fileUrl + '\',\'_blank\')" loading="eager"' +
        ' onload="if(typeof _preCacheImg===\'function\')_preCacheImg(this.getAttribute(\'data-orig\')||this.src)"' +
        ' onerror="if(typeof _stkImgErr===\'function\')_stkImgErr(this)">' +
        '<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,.65);color:#fff;font-size:10px;font-weight:900;padding:2px 6px;border-radius:6px;letter-spacing:.5px">GIF</div>' +
        '</div>';
    } else if (_mft.startsWith('image/')) {
      var _imgIsMine = (typeof currentUser !== 'undefined' && currentUser && msg.senderId === currentUser.uid);
      if (isVO) {
        // ── View-once IMAGE for classroom ────────────────────────────────────
        var _PUB_IMG_VO_ICN = '<svg width="18" height="18" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="10" stroke="white" stroke-width="2.2"/><line x1="13" y1="7.5" x2="13" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="13" x2="16.5" y2="15.5" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="5" r="4" fill="white"/><text x="22" y="8" text-anchor="middle" font-size="6" fill="#9333ea" font-weight="900" font-family="Arial">1</text></svg>';
        if (_imgIsMine) {
          fileHtml = '<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:rgba(255,255,255,.07);border-radius:12px;min-width:180px">' +
            '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" fill="white"/><polyline points="21 15 16 10 5 21" stroke="white" stroke-width="2"/></svg>' +
            '</div>' +
            '<div><div style="font-size:13px;font-weight:700;color:#e9edef">View once photo</div><div style="font-size:11px;color:#8696a0">Sent · view once</div></div>' + _PUB_IMG_VO_ICN + '</div>';
        } else if (voOpened) {
          fileHtml = '<div style="font-size:12px;color:#8696a0;display:flex;align-items:center;gap:5px;margin-top:4px">' + _PUB_IMG_VO_ICN + ' Opened</div>';
        } else {
          fileHtml = '<div onclick="_pubVORevealFile(\'' + msg.id + '\',\'' + esc(msg.fileUrl||'').replace(/'/g,"\\'") + '\')" style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.07);border-radius:12px;padding:9px 11px;cursor:pointer;-webkit-tap-highlight-color:transparent;margin-top:4px">' +
            '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;flex-shrink:0">' + _PUB_IMG_VO_ICN + '</div>' +
            '<div><div style="font-size:13px;font-weight:700;color:#e9edef">View once photo</div><div style="font-size:11px;color:#8696a0">Tap to view — disappears after</div></div></div>';
        }
      } else {
        // Register callbacks so image viewer 3-dot Delete/Reply/React work
        if (!window._vpCbs) window._vpCbs = {};
        (function(_mid, _mine, _sn, _furl, _ftype) {
          window._vpCbs[_mid] = {
            onDelete: function() { if (_mine) db.ref('public_chat/' + _mid).remove(); },
            onReply: function() { if (typeof showPubReply === 'function') showPubReply(_mid, _sn, '', _furl, _ftype, false); },
            onReact: function(em) { if (typeof currentUser !== 'undefined' && currentUser) db.ref('public_chat/' + _mid + '/reactions/' + currentUser.uid).set(em); },
            onForward: function() { if (typeof showForwardPicker === 'function') showForwardPicker('', _mid, _furl, _ftype); }
          };
        })(msg.id, _imgIsMine, msg.senderName || 'Student', msg.fileUrl, msg.fileType);
        fileHtml = (typeof buildPublicImageHtml === 'function')
          ? buildPublicImageHtml(msg.fileUrl, msg.id, _imgIsMine)
          : '<div style="position:relative;display:block;margin-top:8px"><img src="' + msg.fileUrl + '" style="border-radius:12px;max-width:100%;max-height:260px;object-fit:cover;cursor:pointer;display:block" onclick="window.open(\'' + msg.fileUrl + '\',\'_blank\')" loading="lazy" onerror="this.style.display=\'none\'"></div>';
      }
    } else if (_mft.startsWith('audio/')) {
      fileHtml = buildWaVoiceBubble(msg.fileUrl, msg.id);
    } else if (_mft.startsWith('video/')) {
      var _pubIsMine = (typeof currentUser !== 'undefined' && currentUser && msg.senderId === currentUser.uid);
      if (isVO) {
        // View-once video
        var _PUB_VO_ICN = '<svg width="18" height="18" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="10" stroke="white" stroke-width="2.2"/><line x1="13" y1="7.5" x2="13" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="13" x2="16.5" y2="15.5" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="5" r="4" fill="white"/><text x="22" y="8" text-anchor="middle" font-size="6" fill="#9333ea" font-weight="900" font-family="Arial">1</text></svg>';
        if (_pubIsMine) {
          fileHtml = '<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:rgba(255,255,255,.07);border-radius:12px;min-width:180px">'+
            '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>'+
            '</div>'+
            '<div><div style="font-size:13px;font-weight:700;color:#e9edef">View once video</div><div style="font-size:11px;color:#8696a0">Sent</div></div>'+
            _PUB_VO_ICN+
          '</div>';
        } else if (voOpened) {
          fileHtml = '<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:rgba(255,255,255,.07);border-radius:12px;min-width:180px">'+
            '<div style="width:36px;height:36px;border-radius:50%;background:#374151;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'+
            '</div>'+
            '<div><div style="font-size:13px;font-weight:700;color:#8696a0">View once video</div><div style="font-size:11px;color:#8696a0;font-style:italic">Opened</div></div>'+
          '</div>';
        } else {
          fileHtml='<div data-vovid="'+ msg.id +'" data-vovurl="'+ esc(msg.fileUrl) +'" onclick="_pubVOVideoReveal(this.dataset.vovid,this.dataset.vovurl)" style="position:relative;width:220px;height:155px;border-radius:12px;overflow:hidden;cursor:pointer;background:#000;margin-top:6px">'+
            '<video src="'+msg.fileUrl+'" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;filter:blur(12px);display:block;pointer-events:none" onloadedmetadata="this.currentTime=0.5"></video>'+
            '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(0,0,0,.35)">'+
              '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.5)">'+_PUB_VO_ICN+'</div>'+
              '<div style="text-align:center"><div style="font-size:13px;font-weight:700;color:#fff">View once video</div><div style="font-size:11px;color:rgba(255,255,255,.75)">Tap to play · once only</div></div>'+
            '</div>'+
          '</div>';
        }
      } else {
        // Regular video — register callbacks for fullscreen player
        if (!window._vpCbs) window._vpCbs = {};
        window._vpCbs[msg.id] = {
          onDelete: function() { if (_pubIsMine) db.ref('public_chat/' + msg.id).remove(); },
          onReply: function() { if (typeof showPubReply === 'function') showPubReply(msg.id, msg.senderName || 'Student', msg.message || msg.text || '', msg.fileUrl || null, msg.fileType || null, false); },
          onReact: function(em) { if (typeof currentUser !== 'undefined' && currentUser) db.ref('public_chat/' + msg.id + '/reactions/' + currentUser.uid).set(em); },
          onForward: function() { if (typeof showForwardPicker === 'function') showForwardPicker('', msg.id, msg.fileUrl, msg.fileType); }
        };
        fileHtml = (typeof buildInlineVideoHtml === 'function')
          ? buildInlineVideoHtml(msg.fileUrl, msg.id, msg.senderName || 'Student', msg.timestamp, _pubIsMine)
          : '<video controls src="' + msg.fileUrl + '" preload="none" style="max-width:100%;max-height:200px;border-radius:10px;margin-top:6px;display:block"></video>';
      }
    } else {
      var _fext = ((msg.fileName||msg.fileUrl||'').split('.').pop()||'').toLowerCase();
      var _fico = {pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📋',pptx:'📋',zip:'🗜️',apk:'📦',aia:'📦',txt:'📃'}[_fext]||'📎';
      var _flbl = msg.fileName || 'Download file';
      // Use instant download (no browser redirect) via onclick fetch+blob
      fileHtml = '<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border-radius:12px;padding:10px 14px;margin-top:6px;cursor:pointer" onclick="_instantDL(\''+msg.fileUrl+'\',\''+(_flbl.replace(/'/g,"\\'"))+'\')">' +
        '<span style="font-size:28px">' + _fico + '</span>' +
        '<div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">' + _flbl + '</div>' +
        '<div style="font-size:11px;color:#9ca3af">Tap to download</div></div>' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' +
      '</div>';
    }
  }

  var reactHtml = buildReactionsHtml(msg.reactions, msg.id);

  // Reply bubble — WhatsApp style
  var replyHtml = '';
  if (msg.replyTo) {
    var _rThumbPub = '';
    if (!msg.replyTo.viewOnce && msg.replyTo.fileUrl && msg.replyTo.fileType) {
      var _rft3 = msg.replyTo.fileType;
      if (_rft3 === 'image/sticker') {
        _rThumbPub = '<img src="'+msg.replyTo.fileUrl+'" style="width:42px;height:42px;object-fit:contain;border-radius:6px;flex-shrink:0;background:rgba(255,255,255,.05)" onerror="this.style.display=\'none\'">';
      } else if (_rft3 === 'image/gif' || (msg.replyTo.fileUrl && msg.replyTo.fileUrl.includes('giphy.com'))) {
        _rThumbPub = '<div style="width:42px;height:42px;border-radius:6px;overflow:hidden;flex-shrink:0;position:relative"><img src="'+msg.replyTo.fileUrl+'" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display=\'none\'"><span style="position:absolute;bottom:1px;left:2px;font-size:8px;font-weight:900;color:#fff;background:rgba(0,0,0,.6);border-radius:3px;padding:0 3px">GIF</span></div>';
      } else if (_rft3.startsWith('image/')) {
        _rThumbPub = '<img src="'+msg.replyTo.fileUrl+'" style="width:38px;height:38px;object-fit:cover;border-radius:5px;flex-shrink:0" onerror="this.style.display=\'none\'">';
      } else if (_rft3.startsWith('video/')) {
        var _rvsid = 'rv' + (msg.replyTo.id||'').replace(/[^a-zA-Z0-9]/g,'').substring(0,10);
        _rThumbPub =
          '<div style="width:46px;height:46px;border-radius:6px;overflow:hidden;flex-shrink:0;position:relative;background:#0d1117">'+
            '<video id="_rv_'+_rvsid+'" src="'+msg.replyTo.fileUrl+'" muted playsinline preload="auto" '+
              'style="width:100%;height:100%;object-fit:cover;display:none" '+
              'onloadedmetadata="(function(v){'+
                'v.currentTime=0.001;'+
                'var d=Math.floor(v.duration||0);'+
                'var e=document.getElementById(\'_rvd_'+_rvsid+'\');'+
                'if(e&&d>0){var m=Math.floor(d/60),s=d%60;e.textContent=m+\':\'+(s<10?\'0\':\'\')+s;}'+
              '})(this)" '+
              'oncanplay="(function(v){v.style.display=\'block\';})(this)"></video>'+
            '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">'+
              '<div style="width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center">'+
                '<svg width="8" height="8" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>'+
              '</div>'+
            '</div>'+
            '<div id="_rvd_'+_rvsid+'" style="position:absolute;bottom:2px;right:2px;font-size:8px;font-weight:800;color:#fff;background:rgba(0,0,0,.65);border-radius:3px;padding:0 3px;line-height:14px"></div>'+
          '</div>';
      }
    }
    var _rLabelPub = msg.replyTo.viewOnce ? '🔒 View once message' :
                     msg.replyTo.fileType === 'image/sticker' ? '🎭 Sticker' :
                     msg.replyTo.fileType === 'image/gif' ? '🎞 GIF' :
                     (msg.replyTo.fileType && msg.replyTo.fileType.startsWith('image/')) ? '📷 Photo' :
                     (msg.replyTo.fileType && msg.replyTo.fileType.startsWith('audio/')) ? '🎙 Voice note' :
                     (msg.replyTo.fileType && msg.replyTo.fileType.startsWith('video/')) ? '🎬 Video' :
                     esc((msg.replyTo.text || '').substring(0, 60));
    replyHtml = '<div class="_replyPreview" style="display:flex;align-items:center;background:rgba(0,0,0,.25);border-left:4px solid #25d366;border-radius:0 8px 8px 0;padding:6px 8px;margin-bottom:8px;cursor:pointer;overflow:hidden;gap:4px" onclick="scrollToPubMsg(\'' + (msg.replyTo.id||'') + '\')">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="color:#25d366;font-weight:700;font-size:11px;margin-bottom:2px">' + esc(msg.replyTo.senderName||'') + '</div>'+
        '<div style="font-size:12px;color:rgba(255,255,255,.65);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _rLabelPub + '</div>'+
      '</div>' + _rThumbPub +
    '</div>';
  }

  // @mention highlight — tappable, navigates to private E2EE chat
  var rawMsg = msg.message || msg.text || '';
  var isVO = !!msg.viewOnce;
  // voOpened: per-user in Firebase under vo_opened/{uid}/{msgId}
  var voOpened = false;
  var _uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
  if (_uid) {
    try { voOpened = !!JSON.parse(localStorage.getItem('_vo_pub_' + _uid + '_' + msg.id)); } catch(e) {}
    // Also listen for Firebase-synced state (set asynchronously)
    if (!voOpened) {
      db.ref('vo_opened/' + _uid + '/' + msg.id).once('value').then(function(s) {
        if (s.val()) {
          try { localStorage.setItem('_vo_pub_' + _uid + '_' + msg.id, 'true'); } catch(e2) {}
          var el = document.getElementById('pm_' + msg.id);
          if (el) {
            var locked = el.querySelector('[onclick*="_pubVOReveal"]');
            if (locked) locked.outerHTML = '<div style="font-size:12px;color:#8696a0;display:flex;align-items:center;gap:5px">Opened</div>';
          }
        }
      }).catch(function(){});
    }
  }
  var _PUB_VO_ICON = '<svg width="14" height="14" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="10" stroke="rgba(255,255,255,0.7)" stroke-width="2.2"/><line x1="13" y1="7.5" x2="13" y2="13" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="13" x2="16.5" y2="15.5" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="5" r="4" fill="white"/><text x="22" y="8" text-anchor="middle" font-size="6" fill="#9333ea" font-weight="900" font-family="Arial">1</text></svg>';

  var displayText;
  if (isVO && rawMsg && !msg.fileUrl) {
    if (isMine) {
      displayText = '<div style="display:flex;align-items:center;gap:7px;padding:1px 0">' + _PUB_VO_ICON + '<span style="font-size:13px;color:rgba(255,255,255,.7);font-style:italic">View once</span></div>';
    } else if (voOpened) {
      displayText = '<div style="font-size:12px;color:#8696a0;display:flex;align-items:center;gap:5px">' + _PUB_VO_ICON + ' Opened</div>';
    } else {
      displayText = '<div onclick="_pubVOReveal(\'' + msg.id + '\',\'' + esc(rawMsg).replace(/'/g,"\\'") + '\')" style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.07);border-radius:12px;padding:9px 11px;cursor:pointer;-webkit-tap-highlight-color:transparent">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<svg width="18" height="18" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="10" stroke="white" stroke-width="2.2"/><line x1="13" y1="7.5" x2="13" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="13" x2="16.5" y2="15.5" stroke="white" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="5" r="4" fill="white"/><text x="22" y="8" text-anchor="middle" font-size="6" fill="#9333ea" font-weight="900" font-family="Arial">1</text></svg>' +
        '</div>' +
        '<div><div style="font-size:13px;font-weight:700;color:#e9edef">View once message</div><div style="font-size:11px;color:#8696a0">Tap to read — disappears after</div></div>' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8696a0" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>' +
      '</div>';
    }
  } else {
    displayText = esc(rawMsg).replace(/@(\w+)/g, function(_, name) {
      return '<span style="color:#60a5fa;font-weight:700;cursor:pointer;text-decoration:underline dotted" onclick="openPrivateChatByName(\'' + name + '\')" >@' + name + '</span>';
    }).replace(/\[call:([^\]]+)\]/g,'<a href="tel:$1" style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;border-radius:10px;padding:5px 12px;text-decoration:none;font-size:13px;font-weight:700;margin-top:4px">📞 Call</a>');

    // Special card rendering
    var specialCard = (typeof buildSpecialCard === 'function') ? buildSpecialCard(rawMsg, msg.id) : '';
    if (specialCard) displayText = specialCard;
  }

  var voTickHtml = isVO ? (' ' + _PUB_VO_ICON) : '';

  // Starred indicator
  var isStarred = typeof _pubStarred !== 'undefined' && _pubStarred.has(msg.id);
  var _isStickerMsg = (msg.fileType === 'image/sticker');
  var _fwdHtml = msg.forwarded ?
    '<div style="display:flex;align-items:center;gap:4px;color:#8696a0;font-size:11.5px;font-style:italic;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,.06)">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8696a0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="7 17 12 12 7 7"/></svg>' +
      '<span>Forwarded</span>' +
    '</div>' : '';

  var _headerHtml =
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
      '<span style="font-weight:700;font-size:14px">' + name + '</span>' +
      (isMine ? '<span style="font-size:11px;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;padding:1px 6px;border-radius:8px;font-weight:600">You</span>' : '') +
      '<span style="font-size:11px;color:#6b7280">' + timeAgoStr(msg.timestamp) + voTickHtml + '</span>' +
      (isStarred ? '<span style="font-size:11px">⭐</span>' : '') +
    '</div>';

  if (_isStickerMsg) {
    // WhatsApp sticker style: no bubble background, floating image, timestamp below naked
    div.innerHTML =
      avatarHtml +
      '<div style="flex:1;min-width:0">' +
        _headerHtml +
        '<div id="bubble_' + msg.id + '" style="display:inline-block">' +
          fileHtml +
          '<div style="font-size:11px;color:#6b7280;padding:3px 2px 0">' + timeAgoStr(msg.timestamp) + '</div>' +
        '</div>' +
        (reactHtml ? '<div class="reactions-bar" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">' + reactHtml + '</div>' : '<div class="reactions-bar" style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px"></div>') +
      '</div>';
  } else {
    div.innerHTML =
      avatarHtml +
      '<div style="flex:1;min-width:0">' +
        _headerHtml +
        '<div id="bubble_' + msg.id + '" style="background:#1f2937;border-radius:18px;border-top-left-radius:4px;padding:12px 16px;font-size:14px;line-height:1.5;word-break:break-word;overflow:hidden;max-width:100%;box-sizing:border-box' + (isStarred?';outline:2px solid #fbbf24;outline-offset:2px':'') + '">' +
          _fwdHtml + replyHtml + '<span class="_pmtext">' + displayText + '</span>' + fileHtml +
        '</div>' +
        (reactHtml ? '<div class="reactions-bar" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">' + reactHtml + '</div>' : '<div class="reactions-bar" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px"></div>') +
      '</div>';
  }

  // Tap = reaction only | Long press = selection mode (media: long press = reaction only)
  div.setAttribute('data-msgid', msg.id);
  div.setAttribute('data-msgtext', (msg.message || msg.text || ''));
  div.setAttribute('data-fileurl', (msg.fileUrl || ''));
  div.setAttribute('data-filetype', (msg.fileType || ''));
  div.setAttribute('data-sendername', (msg.senderName || 'Student'));
  var _isMedMsg = !!(msg.fileUrl); // any file attachment — tap opens file, long-press shows reaction
  attachMsgInteraction(div,
    // onTap: text → full context sheet (emoji pill + action card); media → nothing
    _isMedMsg ? null : function(e) {
      window._currentMsgSender = msg.senderName || 'Student';
      window._currentMsgFileUrl = msg.fileUrl || null;
      window._currentMsgFileType = msg.fileType || null;
      showMsgContextMenu(e, msg.id, isMine, msg.message || msg.text || '', msg.fileType || '');
    },
    // onLongPress: text → selection mode; media → reaction emoji pill only
    _isMedMsg ? function(e) {
      _lpBlockCtx = 0;
      showReactionOnlySheet(e, function(em){ reactMsg(msg.id, em); });
    } : function(e) {
      _lpBlockCtx = 0;
      enterSelectMode(msg.id, {
        onReply: function(ids) {
          var id = ids[0]; if (!id) return;
          var el = document.querySelector('[data-msgid="'+id+'"]');
          if (typeof showPubReply === 'function') showPubReply(id,
            (el && el.getAttribute('data-sendername')) || 'Student',
            (el && el.getAttribute('data-msgtext')) || '',
            (el && el.getAttribute('data-fileurl')) || null,
            (el && el.getAttribute('data-filetype')) || null,
            false);
        },
        onForward: function(ids) {
          if (!ids.length) return;
          var el = document.querySelector('[data-msgid="'+ids[0]+'"]');
          if (typeof showForwardPicker === 'function') showForwardPicker(
            (el && el.getAttribute('data-msgtext')) || '',
            ids[0],
            (el && el.getAttribute('data-fileurl')) || null,
            (el && el.getAttribute('data-filetype')) || null
          );
        },
        onDelete: function(ids) {
          if (typeof deletePubMsg === 'function') ids.forEach(function(id) { deletePubMsg(id); });
        }
      });
    }
  );

  // ── Swipe-to-reply (WhatsApp style, 80px threshold) ──────────────────────
  var _swStartX=0, _swStartY=0, _swDx=0, _swSwiped=false;
  var _swEl = div.querySelector('[id^="bubble_"]') || div;
  div.addEventListener('touchstart', function(e){
    _swStartX=e.touches[0].clientX; _swStartY=e.touches[0].clientY; _swDx=0; _swSwiped=false;
  }, {passive:true});
  div.addEventListener('touchmove', function(e){
    var dy=Math.abs(e.touches[0].clientY-_swStartY);
    _swDx=e.touches[0].clientX-_swStartX;
    if(dy>22){_swDx=0;return;}
    // Right swipe to reply (WhatsApp behaviour)
    if(_swDx>0&&_swDx<100){ _swEl.style.transform='translateX('+_swDx+'px)'; _swEl.style.transition='none'; }
  }, {passive:true});
  div.addEventListener('touchend', function(){
    _swEl.style.transition='transform .2s ease'; _swEl.style.transform='';
    if(_swDx>80&&!_swSwiped){
      _swSwiped=true;
      if(navigator.vibrate) navigator.vibrate(30);
      // Trigger classroom reply bar
      if(typeof showPubReply==='function'){
        showPubReply(msg.id, msg.senderName||'Student', msg.message||msg.text||'', msg.fileUrl||null, msg.fileType||null, !!msg.viewOnce);
      }
    }
  });

  container.appendChild(div);

  // Lazy-load profile photo if not already in message or cache
  if (!isBot && msg.senderId && !senderPhoto && window._photoCache[msg.senderId] === undefined) {
    window._photoCache[msg.senderId] = null; // mark as loading
    db.ref('users/' + msg.senderId + '/photoURL').once('value').then(function(snap) {
      var photo = snap.val() || null;
      window._photoCache[msg.senderId] = photo;
      if (!photo) return;
      // Update avatar in the rendered div
      var avEl = div.querySelector('[data-avid="' + msg.senderId + '"]');
      if (avEl) {
        avEl.style.overflow = 'hidden';
        avEl.innerHTML = '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentElement.innerHTML=\'' + initial + '\'">';
      }
    }).catch(function(){});
  }
}

// ── Public chat view-once reveal ──────────────────────────────────────────────
window._pubVOReveal = function(msgId, text) {
  var _uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
  if (_uid) {
    try { localStorage.setItem('_vo_pub_' + _uid + '_' + msgId, 'true'); } catch(e) {}
    // Write to Firebase so other devices/accounts don't see it as unread
    db.ref('vo_opened/' + _uid + '/' + msgId).set(true).catch(function(){});
  }
  var el = document.getElementById('pm_' + msgId);
  if (el) {
    var locked = el.querySelector('[onclick*="_pubVOReveal"]');
    if (locked) locked.outerHTML = '<div style="font-size:12px;color:#8696a0;display:flex;align-items:center;gap:5px">Opened</div>';
  }
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px';
  ov.innerHTML =
    '<button onclick="this.parentElement.remove()" style="position:absolute;top:20px;right:20px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:white;font-size:22px;cursor:pointer">✕</button>' +
    '<div style="max-width:320px;width:100%;background:#1f2c34;border-radius:20px;padding:22px;text-align:center">' +
      '<div style="font-size:15px;color:#e9edef;line-height:1.6;white-space:pre-wrap">' + (text||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&') + '</div>' +
    '</div>' +
    '<p style="color:#8696a0;font-size:12px;margin-top:14px;text-align:center">This message will not be available again</p>';
  document.body.appendChild(ov);
};

window._pubVOVideoReveal = function(msgId, videoUrl) {
  var _uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
  if(_uid){
    try { localStorage.setItem('_vo_pub_'+_uid+'_'+msgId,'true'); } catch(e) {}
    db.ref('vo_opened/'+_uid+'/'+msgId).set(true).catch(function(){});
  }
  // Update bubble to "Opened"
  var el = document.getElementById('pm_'+msgId);
  if(el){
    var locked = el.querySelector('[onclick*="_pubVOVideoReveal"]');
    if(locked) locked.outerHTML =
      '<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:rgba(255,255,255,.07);border-radius:12px;min-width:180px">'+
        '<div style="width:36px;height:36px;border-radius:50%;background:#374151;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'+
        '</div>'+
        '<div><div style="font-size:13px;font-weight:700;color:#8696a0">View once video</div><div style="font-size:11px;color:#8696a0;font-style:italic">Opened</div></div>'+
      '</div>';
  }
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center';
  ov.innerHTML =
    '<div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;z-index:2">'+
      '<span style="color:rgba(255,255,255,.7);font-size:13px">View once · plays once</span>'+
      '<button id="_pubVovClose" style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:18px;cursor:pointer">✕</button>'+
    '</div>'+
    '<video id="_pubVovVid" src="'+videoUrl+'" autoplay playsinline controls style="max-width:100%;max-height:85vh;object-fit:contain;border-radius:12px"></video>'+
    '<div style="position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.65);border-radius:20px;padding:8px 18px;color:rgba(255,255,255,.8);font-size:12px;text-align:center">This video can only be played once</div>';
  document.body.appendChild(ov);
  var vid = document.getElementById('_pubVovVid');
  document.getElementById('_pubVovClose').onclick = function(){ ov.remove(); };
  if(vid){
    vid.onended = function(){ ov.remove(); };
    vid.oncontextmenu = function(e){ e.preventDefault(); return false; };
  }
};

// Navigate to private chat from a contact bubble message button
window._contactMsgUser = function(name) {
  if (typeof openPrivateChatByName === 'function') openPrivateChatByName(name);
  else if (typeof showToast === 'function') showToast('Opening chat with ' + name + '...');
};

// View-once IMAGE reveal for classroom (public chat)
window._pubVORevealFile = function(msgId, url) {
  var _uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
  if (_uid) {
    try { localStorage.setItem('_vo_pub_' + _uid + '_' + msgId, 'true'); } catch(e) {}
    db.ref('vo_opened/' + _uid + '/' + msgId).set(true).catch(function(){});
  }
  // Update bubble to Opened
  var el = document.getElementById('pm_' + msgId);
  if (el) {
    var locked = el.querySelector('[onclick*="_pubVORevealFile"]');
    if (locked) locked.outerHTML = '<div style="font-size:12px;color:#8696a0;display:flex;align-items:center;gap:5px;margin-top:4px">Opened</div>';
  }
  // Full-screen viewer (no save, no right-click)
  var ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none';
  ov.innerHTML =
    '<div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:16px;z-index:2;background:linear-gradient(to bottom,rgba(0,0,0,.6),transparent)">' +
      '<div style="background:linear-gradient(135deg,#9333ea,#ec4899);border-radius:20px;padding:4px 12px;font-size:11px;color:#fff;font-weight:700;letter-spacing:.3px">👁 VIEW ONCE</div>' +
      '<button onclick="this.closest(\'[data-voov]\').remove()" style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>' +
    '</div>' +
    '<img src="' + (url||'').replace(/"/g,'&quot;') + '" style="max-width:96vw;max-height:78vh;border-radius:16px;object-fit:contain;pointer-events:none;-webkit-user-select:none;user-select:none" oncontextmenu="return false">' +
    '<div style="position:absolute;bottom:28px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);border-radius:20px;padding:8px 20px;color:rgba(255,255,255,.8);font-size:12px;text-align:center;white-space:nowrap">📵 This photo will not be available again</div>';
  ov.setAttribute('data-voov', '1');
  ov.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });
  document.body.appendChild(ov);
};

function viewSenderProfile(uid, name) {
  if (!uid || uid === 'anon') return;

  // Inject "coming soon" animation once
  if (!document.getElementById('_profileCSS')) {
    var cs = document.createElement('style'); cs.id = '_profileCSS';
    cs.textContent = '@keyframes _profileUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}' +
      '@keyframes _sonarPulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0}}';
    document.head.appendChild(cs);
  }

  // Remove any existing profile sheet
  var existing = document.getElementById('_senderProfileOv');
  if (existing) existing.remove();

  var ov = document.createElement('div');
  ov.id = '_senderProfileOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9950;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

  // Placeholder while loading
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:#111827;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding-bottom:36px;animation:_profileUp .28s cubic-bezier(.34,1.1,.64,1)';
  sheet.innerHTML =
    '<div style="display:flex;justify-content:center;padding:12px 0 6px">' +
      '<div style="width:36px;height:4px;background:#374151;border-radius:2px"></div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;align-items:center;padding:20px 24px 24px;gap:10px">' +
      '<div style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:36px;color:#fff">' +
        (name[0]||'?').toUpperCase() +
      '</div>' +
      '<div style="text-align:center">' +
        '<p style="font-size:20px;font-weight:800;color:#fff;margin:0">' + (name||'Student') + '</p>' +
        '<p style="color:#6b7280;font-size:13px;margin:4px 0 0" id="_spStatus">ESUT Physio Member</p>' +
      '</div>' +
    '</div>' +
    // Action buttons row
    '<div style="display:flex;justify-content:center;gap:20px;padding:0 24px 24px">' +
      // Message
      '<button id="_spMsgBtn" style="display:flex;flex-direction:column;align-items:center;gap:8px;background:rgba(236,72,153,.12);border:1.5px solid rgba(236,72,153,.25);border-radius:20px;padding:18px 24px;cursor:pointer;min-width:90px;-webkit-tap-highlight-color:transparent">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
        '<span style="color:#ec4899;font-size:12px;font-weight:700">Message</span>' +
      '</button>' +
      // Call
      '<button id="_spCallBtn" style="display:flex;flex-direction:column;align-items:center;gap:8px;background:rgba(147,51,234,.12);border:1.5px solid rgba(147,51,234,.25);border-radius:20px;padding:18px 24px;cursor:pointer;min-width:90px;-webkit-tap-highlight-color:transparent">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>' +
        '<span style="color:#a78bfa;font-size:12px;font-weight:700">Call</span>' +
      '</button>' +
      // Video
      '<button id="_spVideoBtn" style="display:flex;flex-direction:column;align-items:center;gap:8px;background:rgba(99,102,241,.12);border:1.5px solid rgba(99,102,241,.25);border-radius:20px;padding:18px 24px;cursor:pointer;min-width:90px;-webkit-tap-highlight-color:transparent">' +
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>' +
        '<span style="color:#818cf8;font-size:12px;font-weight:700">Video</span>' +
      '</button>' +
    '</div>' +
    // Close
    '<div style="padding:0 20px">' +
      '<button id="_spCloseBtn" style="width:100%;background:#1f2937;border:1.5px solid #374151;border-radius:16px;color:#9ca3af;font-size:15px;font-weight:600;padding:14px;cursor:pointer;-webkit-tap-highlight-color:transparent">Close</button>' +
    '</div>';

  ov.appendChild(sheet);
  ov.addEventListener('click', function(e){ if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);

  // Button handlers
  document.getElementById('_spCloseBtn').onclick = function() { ov.remove(); };

  document.getElementById('_spMsgBtn').onclick = function() {
    ov.remove();
    // Navigate to private e2ee chatroom
    if (typeof window.location !== 'undefined') {
      // Build path — works from chat.html (root-level) and pages/*.html
      var base = window.location.pathname.indexOf('/pages/') >= 0 ? '' : 'pages/';
      window.location.href = base + 'chatroom.html?uid=' + uid + '&name=' + encodeURIComponent(name);
    }
  };

  document.getElementById('_spCallBtn').onclick = function() {
    _showComingSoon('Voice Call', 'Voice calls between users are coming in the next update. Stay tuned! 🎙️');
  };

  document.getElementById('_spVideoBtn').onclick = function() {
    _showComingSoon('Video Call', 'Video calls are coming soon. This will support real-time face-to-face calls between Physio SUAI members. 📹');
  };

  // Load full user data from Firebase
  if (typeof db !== 'undefined') {
    db.ref('users/' + uid).once('value').then(function(snap) {
      var u = snap.val() || {};
      // Update avatar with photo if available
      var avatarDiv = sheet.querySelector('div[style*="88px"]');
      if (avatarDiv && u.photoURL) {
        avatarDiv.innerHTML = '<img src="' + u.photoURL + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent=\'' + (u.name||name||'S')[0].toUpperCase() + '\'">';
      }
      // Update name
      var nameEl = sheet.querySelector('p[style*="20px"]');
      if (nameEl) nameEl.textContent = u.name || name || 'Student';
      // Update status
      var statusEl = document.getElementById('_spStatus');
      if (statusEl) statusEl.textContent = u.bio || u.status || 'ESUT Physio Member';
    }).catch(function(){});
  }
}

// ── Coming Soon modal ──────────────────────────────────────────────────────────
function _showComingSoon(title, message) {
  var ex = document.getElementById('_comingSoonOv'); if (ex) ex.remove();
  var ov = document.createElement('div');
  ov.id = '_comingSoonOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ov.innerHTML =
    '<div style="background:#111827;border-radius:24px;width:100%;max-width:320px;overflow:hidden;border:1px solid rgba(147,51,234,.2);box-shadow:0 24px 60px rgba(0,0,0,.8)">' +
      // Icon with sonar pulse animation
      '<div style="padding:32px 24px 20px;display:flex;flex-direction:column;align-items:center;gap:16px">' +
        '<div style="position:relative;width:72px;height:72px;display:flex;align-items:center;justify-content:center">' +
          '<div style="position:absolute;width:72px;height:72px;border-radius:50%;background:rgba(147,51,234,.2);animation:_sonarPulse 1.6s ease-out infinite"></div>' +
          '<div style="position:absolute;width:72px;height:72px;border-radius:50%;background:rgba(147,51,234,.15);animation:_sonarPulse 1.6s ease-out .4s infinite"></div>' +
          '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;position:relative;z-index:1">' +
            '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:center">' +
          '<p style="font-size:18px;font-weight:800;color:#fff;margin:0">' + title + '</p>' +
          '<p style="color:#9ca3af;font-size:14px;line-height:1.55;margin:8px 0 0">' + message + '</p>' +
        '</div>' +
        '<div style="background:rgba(147,51,234,.1);border:1px solid rgba(147,51,234,.3);border-radius:12px;padding:10px 16px;width:100%;box-sizing:border-box;text-align:center">' +
          '<span style="color:#a78bfa;font-size:13px;font-weight:600">🚧 Coming Soon</span>' +
        '</div>' +
      '</div>' +
      '<div style="padding:0 20px 24px">' +
        '<button onclick="document.getElementById(\'_comingSoonOv\').remove()" style="width:100%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;padding:14px;cursor:pointer">Got it</button>' +
      '</div>' +
    '</div>';
  ov.addEventListener('click', function(e){ if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}

function closeSenderModal(btn) {
  var ov = document.getElementById('_senderProfileOv');
  if (ov) { ov.remove(); return; }
  document.querySelectorAll('[data-sender-modal]').forEach(function(m){ m.remove(); });
}

function timeAgoStr(ts) {
  if (!ts) return '';
  var s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

function loadPrivateChat(recipientId, container) {
  const chatPath = `private_chats/${[currentUser.uid, recipientId].sort().join('_')}`;
  
  listenToFirebase(chatPath, (messages) => {
    container.innerHTML = messages.map(msg => {
      const isMine = msg.senderId === currentUser.uid;
      return `
        <div class="flex items-end space-x-2 mb-4 ${isMine ? 'flex-row-reverse space-x-reverse' : ''}">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            ${msg.senderName[0].toUpperCase()}
          </div>
          <div class="max-w-[70%]">
            <div class="${isMine ? 'bg-pink-500' : 'bg-gray-700'} rounded-2xl p-3 ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}">
              <p class="text-white break-words">${msg.message}</p>
              ${msg.fileUrl ? `
                <div class="mt-2">
                  ${msg.fileType?.startsWith('image/') ? `<img src="${msg.fileUrl}" class="rounded-lg max-w-full cursor-pointer" onclick='viewFile("${msg.fileUrl}", "${msg.fileType}", "Image")'>` : `<a href="${msg.fileUrl}" class="text-white underline">📎 Attachment</a>`}
                </div>
              ` : ''}
            </div>
            <span class="text-xs text-gray-400 mt-1 block ${isMine ? 'text-right' : ''}">${formatTimestamp(msg.timestamp)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    container.scrollTop = container.scrollHeight;
  });
}

// ============================================================================
// FRIEND SYSTEM
// ============================================================================

async function sendFriendRequest(targetUserId) {
  if (!currentUser) {
    showToast('Please log in to send friend requests', 'error');
    return;
  }
  
  const result = await saveToFirebase(`friend_requests/${targetUserId}`, {
    fromId: currentUser.uid,
    fromName: currentUser.email,
    timestamp: Date.now(),
    status: 'pending'
  });
  
  if (result.success) {
    sendNotification(targetUserId, `${currentUser.email} sent you a friend request`);
    showToast('Friend request sent!');
  }
}

async function acceptFriendRequest(requestId, fromId) {
  // Add to both users' friend lists
  await saveToFirebase(`friends/${currentUser.uid}`, {
    friendId: fromId,
    timestamp: Date.now()
  });
  
  await saveToFirebase(`friends/${fromId}`, {
    friendId: currentUser.uid,
    timestamp: Date.now()
  });
  
  // Delete request
  await db.ref(`friend_requests/${currentUser.uid}/${requestId}`).remove();
  
  showToast('Friend request accepted!');
}

async function loadFriends(container) {
  if (!currentUser) return [];
  
  const friendsData = await getFromFirebase(`friends/${currentUser.uid}`, 100);
  const friends = [];
  
  for (const friend of friendsData) {
    const profile = await getUserProfile(friend.friendId);
    if (profile) {
      friends.push({ ...friend, profile });
    }
  }
  
  if (container) {
    container.innerHTML = friends.length === 0
      ? '<div class="text-center py-12 text-gray-400">No friends yet. Start chatting to make friends!</div>'
      : friends.map(friend => `
        <div class="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-pink-500 transition cursor-pointer" onclick="openPrivateChat('${friend.friendId}')">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
              ${friend.profile.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div class="flex-1">
              <h3 class="font-bold">${friend.profile.name || friend.profile.email || 'User'}</h3>
              <p class="text-sm text-gray-400">${friend.profile.bio || 'Physio SUAI Member'}</p>
            </div>
            <div class="text-green-400">●</div>
          </div>
        </div>
      `).join('');
  }
  
  return friends;
}

function openPrivateChat(friendId) {
  // This will be implemented in the chat page
  window.location.href = `pages/chat.html?friend=${friendId}`;
}

// ============================================================================
// BUSINESS FUNCTIONS
// ============================================================================

async function submitBusiness(name, businessName, businessType, phone, image) {
  showLoading("Registering business...");
  
  let imageUrl = null;
  if (image) {
    const upload = await uploadFile(image, 'businesses');
    if (upload.success) imageUrl = upload.url;
  }
  
  const result = await saveToFirebase('businesses', {
    ownerName: name,
    businessName,
    businessType,
    phone,
    imageUrl,
    ownerId: currentUser ? currentUser.uid : 'anon',
    timestamp: Date.now(),
    orders: [],
    rating: 0,
    reviews: []
  });
  
  hideLoading();
  
  if (result.success) {
    showToast('Business registered successfully!');
    return true;
  } else {
    showToast('Failed to register business', 'error');
    return false;
  }
}

async function loadBusinesses(container) {
  showLoading("Loading businesses...");
  const businesses = await getFromFirebase('businesses', 100);
  hideLoading();
  
  if (!container) return businesses;
  
  container.innerHTML = businesses.length === 0
    ? '<div class="col-span-full text-center py-12 text-gray-400">No businesses yet. Register yours!</div>'
    : businesses.map(business => `
      <div class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition">
        ${business.imageUrl ? `<img src="${business.imageUrl}" class="w-full h-48 object-cover" alt="${business.businessName}">` : `<div class="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-6xl">🏪</div>`}
        <div class="p-4">
          <h3 class="font-bold text-lg mb-1">${business.businessName}</h3>
          <p class="text-gray-400 text-sm mb-2">${business.businessType}</p>
          <p class="text-gray-400 text-sm mb-3">Owner: ${business.ownerName}</p>
          <div class="flex space-x-2">
            <button onclick='placeOrderById(this.dataset.business)' data-business='${JSON.stringify(business)}' class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition">
              🛒 Order
            </button>
            <a href="tel:${business.phone}" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition text-center">
              📞 Call
            </a>
          </div>
        </div>
      </div>
    `).join('');
  
  return businesses;
}

async function placeOrder(business) {
  showModal('Place Order', `
    <div class="space-y-4">
      <p class="text-gray-300">Business: <strong>${business.businessName}</strong></p>
      <input type="number" id="orderQuantity" placeholder="Quantity" min="1" value="1" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500">
      <textarea id="orderNotes" placeholder="Additional notes (optional)" rows="3" class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"></textarea>
      <p class="text-gray-400 text-sm">The business owner will be notified of your order.</p>
    </div>
  `, [
    { text: 'Cancel', onClick: 'this.closest(".fixed").remove()' },
    { 
      text: 'Confirm Order', 
      onClick: `confirmOrder('${business.id}', '${business.ownerId}', '${business.businessName}')`,
      class: 'bg-blue-500 hover:bg-blue-600'
    }
  ]);
}

function placeOrderById(jsonString) {
  try {
    const business = JSON.parse(jsonString);
    placeOrder(business);
  } catch (e) {
    console.error('Error parsing business:', e);
    showToast('Error loading business', 'error');
  }
}

async function confirmOrder(businessId, ownerId, businessName) {
  const quantity = document.getElementById('orderQuantity').value;
  const notes = document.getElementById('orderNotes').value;
  
  showLoading("Placing order...");
  
  const result = await saveToFirebase(`businesses/${businessId}/orders`, {
    customerId: currentUser ? currentUser.uid : 'anon',
    customerName: currentUser ? currentUser.email : 'Anonymous',
    quantity: parseInt(quantity),
    notes,
    timestamp: Date.now(),
    status: 'pending'
  });
  
  if (result.success) {
    sendNotification(ownerId, `New order for ${businessName}! Quantity: ${quantity}`);
    hideLoading();
    showToast('Order placed successfully!');
    document.querySelector('.fixed')?.remove();
  } else {
    hideLoading();
    showToast('Failed to place order', 'error');
  }
}

// ============================================================================
// STUDY AI (GEMINI) FUNCTIONS
// ============================================================================

let geminiConversation = [];

async function askGemini(question, imageFile = null) {
  showLoading("Thinking...");
  
  try {
    // In a real implementation, you would call Gemini API here
    // For now, we'll simulate responses with physiotherapy focus
    
    const responses = [
      `Great question about ${question}! In physiotherapy, this relates to musculoskeletal rehabilitation and therapeutic exercise principles.`,
      `Regarding ${question}, it's important to understand the biomechanics and kinesiological aspects in physiotherapy practice.`,
      `${question} is a fundamental concept in physical therapy. Let me explain the anatomical and functional perspectives.`,
      `In the context of physiotherapy, ${question} involves understanding movement patterns, manual therapy techniques, and evidence-based practice.`
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    geminiConversation.push({
      role: 'user',
      content: question,
      timestamp: Date.now()
    });
    
    geminiConversation.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });
    
    hideLoading();
    return response;
  } catch (error) {
    hideLoading();
    showToast('Failed to get response', 'error');
    return 'Sorry, I encountered an error. Please try again.';
  }
}

function displayGeminiConversation(container) {
  container.innerHTML = geminiConversation.map(msg => `
    <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4">
      <div class="max-w-[80%] ${msg.role === 'user' ? 'bg-pink-500' : 'bg-gray-700'} rounded-2xl p-4">
        <p class="text-white">${msg.content}</p>
        <span class="text-xs text-gray-300 mt-2 block">${formatTimestamp(msg.timestamp)}</span>
      </div>
    </div>
  `).join('');
  
  container.scrollTop = container.scrollHeight;
}

function addPhysiotherapyTip() {
  const tips = [
    {
      title: "Proper Posture While Studying",
      image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
      description: "Maintain a neutral spine position with feet flat on the floor. Screen at eye level."
    },
    {
      title: "Stretching Exercises",
      image: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400",
      description: "Regular stretching improves flexibility and reduces muscle tension. Hold each stretch for 30 seconds."
    },
    {
      title: "Core Strengthening",
      image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400",
      description: "Strong core muscles support better posture and reduce back pain. Try planks and bridges."
    },
    {
      title: "Joint Mobilization",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
      description: "Gentle joint movements maintain range of motion and reduce stiffness."
    }
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
}

// ============================================================================
// LECTURE UPDATE FUNCTIONS
// ============================================================================

async function submitLecture(courseName, lecturerName, hall, time, password) {
  if (password !== '0987654321') {
    showToast('Incorrect password', 'error');
    return false;
  }
  
  if (typeof showNavPill === 'function') showNavPill("Adding lecture…");
  else showLoading("Adding lecture...");
  
  const result = await saveToFirebase('lectures', {
    courseName,
    lecturerName,
    hall,
    time,
    addedBy: currentUser ? currentUser.email : 'Anonymous',
    timestamp: Date.now()
  });
  
  if (typeof hideNavPill === 'function') hideNavPill();
  else hideLoading();
  
  if (result.success) {
    showToast('Lecture added successfully!');
    
    // Set alarm if time is in the future
    try {
      const lectureTime = new Date(time).getTime();
      if (lectureTime > Date.now()) {
        setLectureAlarm(lectureTime, courseName);
      }
    } catch (e) {
      console.error('Alarm error:', e);
    }
    
    return true;
  } else {
    showToast('Failed to add lecture', 'error');
    return false;
  }
}

async function loadLectures(container) {
  if (typeof showNavPill === 'function') showNavPill("Loading lectures…");
  else if (typeof showLoading === 'function') showLoading("Loading lectures...");
  const lectures = await getFromFirebase('lectures', 100);
  if (typeof hideNavPill === 'function') hideNavPill();
  else if (typeof hideLoading === 'function') hideLoading();
  
  if (!container) return lectures;
  
  container.innerHTML = lectures.length === 0
    ? '<div class="col-span-full text-center py-12 text-gray-400">No lectures scheduled yet.</div>'
    : lectures.map(lecture => {
      const lectureTime = new Date(lecture.time);
      const isUpcoming = lectureTime > new Date();
      
      return `
        <div class="bg-gray-800 rounded-xl border-2 ${isUpcoming ? 'border-green-500' : 'border-gray-700'} overflow-hidden">
          <div class="bg-gradient-to-br from-purple-600 to-pink-600 p-6 relative">
            <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml,...')] bg-repeat"></div>
            <h2 class="text-2xl font-bold text-white mb-2 relative z-10">${lecture.courseName}</h2>
            <p class="text-pink-100 relative z-10">🎓 LECTURE CERTIFICATE</p>
          </div>
          <div class="p-6 space-y-3">
            <div class="flex items-center space-x-3">
              <span class="text-2xl">👨‍🏫</span>
              <div>
                <p class="text-sm text-gray-400">Lecturer</p>
                <p class="font-semibold">${lecture.lecturerName}</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-2xl">📍</span>
              <div>
                <p class="text-sm text-gray-400">Hall</p>
                <p class="font-semibold">${lecture.hall}</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <span class="text-2xl">⏰</span>
              <div>
                <p class="text-sm text-gray-400">Time</p>
                <p class="font-semibold">${lectureTime.toLocaleString()}</p>
              </div>
            </div>
            ${isUpcoming ? '<div class="bg-green-500/20 border border-green-500 rounded-lg p-3 mt-4"><p class="text-green-400 text-center font-semibold">📢 Upcoming Lecture</p></div>' : ''}
            <button onclick="deleteLecture('${lecture.id}')" style="margin-top:12px;width:100%;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#f87171;padding:10px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px" onmouseover="this.style.background='rgba(239,68,68,0.3)'" onmouseout="this.style.background='rgba(239,68,68,0.15)'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete Lecture
            </button>
          </div>
        </div>
      `;
    }).join('');
  
  return lectures;
}

async function deleteLecture(lectureId) {
  // Custom modal — no ugly browser prompt
  return new Promise(function(resolve) {
    var existing = document.getElementById('_delLectureModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = '_delLectureModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .18s ease';
    modal.innerHTML = `
      <div style="background:#1f2937;border-radius:20px;padding:28px 24px;width:100%;max-width:340px;border:1px solid #374151;box-shadow:0 20px 60px rgba(0,0,0,.5)">
        <div style="width:52px;height:52px;background:rgba(239,68,68,.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <h3 style="color:#f9fafb;font-size:18px;font-weight:700;text-align:center;margin:0 0 6px">Delete Lecture?</h3>
        <p style="color:#9ca3af;font-size:14px;text-align:center;margin:0 0 20px">Enter the admin password to confirm.</p>
        <input id="_delPwdInput" type="password" placeholder="Admin password"
          style="width:100%;background:#111827;border:1.5px solid #374151;border-radius:12px;padding:12px 14px;color:#f9fafb;font-size:15px;outline:none;box-sizing:border-box;margin-bottom:16px"
          onfocus="this.style.borderColor='#ec4899'" onblur="this.style.borderColor='#374151'">
        <div id="_delErrMsg" style="display:none;color:#f87171;font-size:13px;text-align:center;margin-bottom:12px">❌ Wrong password</div>
        <div style="display:flex;gap:10px">
          <button onclick="document.getElementById('_delLectureModal').remove()"
            style="flex:1;background:#374151;color:#d1d5db;border:none;border-radius:12px;padding:12px;font-size:15px;font-weight:600;cursor:pointer">
            Cancel
          </button>
          <button id="_delConfirmBtn"
            style="flex:1;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:12px;padding:12px;font-size:15px;font-weight:600;cursor:pointer">
            Delete
          </button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    // Focus input
    setTimeout(function(){ var inp=document.getElementById('_delPwdInput'); if(inp) inp.focus(); }, 100);

    document.getElementById('_delConfirmBtn').onclick = async function() {
      var pwd = document.getElementById('_delPwdInput').value;
      if (pwd !== '0987654321') {
        var err = document.getElementById('_delErrMsg');
        if(err){ err.style.display='block'; }
        var inp = document.getElementById('_delPwdInput');
        if(inp){ inp.style.borderColor='#ef4444'; inp.value=''; inp.focus(); }
        return;
      }
      modal.remove();
      try {
        if (typeof showNavPill === 'function') showNavPill('Deleting lecture…'); else showLoading('Deleting lecture...');
        await deleteFromFirebase('lectures/' + lectureId);
        if (typeof hideNavPill === 'function') hideNavPill(); else hideLoading();
        showToast('✅ Lecture deleted!');
        var grid = document.getElementById('lecturesGrid');
        if (grid) loadLectures(grid);
      } catch(e) {
        if (typeof hideNavPill === 'function') hideNavPill(); else hideLoading();
        showToast('❌ Failed: ' + e.message, 'error');
      }
      resolve();
    };

    // Enter key submits
    document.getElementById('_delPwdInput').addEventListener('keydown', function(e){
      if(e.key==='Enter') document.getElementById('_delConfirmBtn').click();
    });
  });
}

function setLectureAlarm(time, courseName) {
  const now = Date.now();
  const delay = time - now;
  
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Lecture Reminder', {
          body: `${courseName} is starting soon!`,
          icon: '/images/logo.png',
          vibrate: [200, 100, 200]
        });
      }
      
      // Play alarm sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiN0/DKdisGI3DC7N2QQAsTXrLr7a5aGg==...');
      audio.play().catch(e => console.log('Audio play failed:', e));
    }, delay);
  }
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// Set daily 5am alarm
function setDailyAlarm() {
  const now = new Date();
  const tomorrow5am = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 5, 0, 0);
  const delay = tomorrow5am - now;
  
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Good Morning!', {
        body: 'Time to wake up and prepare for your physiotherapy studies! 📚',
        icon: '/images/logo.png',
        vibrate: [200, 100, 200, 100, 200]
      });
    }
    
    // Set next day's alarm
    setDailyAlarm();
  }, delay);
}

// Initialize daily alarm
setDailyAlarm();

console.log("✅ Extended features loaded!");

// ── Special message card renderer (shared across all chat pages) ─────────────
function buildSpecialCard(rawText, msgId) {
  var pid = 'sc_'+(msgId||Date.now());

  // ── POLL ──────────────────────────────────────────────────────────────────
  if (/^📊 \*Poll:\*/.test(rawText)) {
    var lines = rawText.split('\n');
    var q = lines[0].replace(/^📊 \*Poll:\*\s*/,'');
    // Extract persistent pollId from [pid:...] marker — survives forwards
    var _pidMatch = rawText.match(/\[pid:([a-z0-9_]+)\]/);
    var voteKey = _pidMatch ? _pidMatch[1] : msgId; // use pollId if present, else fallback to msgId
    var opts = [];
    lines.slice(1).forEach(function(l){
      l = l.trim();
      if (l && !l.startsWith('_') && !/^(view|tap|select)/i.test(l) && !/^\[pid:/.test(l))
        opts.push(l.replace(/^[^a-zA-Z0-9]*\s*/,'').trim());
    });
    opts = opts.filter(function(o){ return o.length > 0; });
    var multi = rawText.indexOf('Multiple answers') > -1;

    var html = '<div style="width:100%;max-width:100%;box-sizing:border-box">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
        '<div style="width:32px;height:32px;background:linear-gradient(135deg,#9333ea,#ec4899);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' +
        '</div>' +
        '<span style="color:rgba(255,255,255,.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px">Poll</span>' +
      '</div>' +
      '<div style="font-weight:700;font-size:15px;color:#fff;margin-bottom:4px;line-height:1.4;word-break:break-word">'+esc(q)+'</div>' +
      '<div style="color:rgba(255,255,255,.45);font-size:12px;margin-bottom:14px">'+(multi?'Select one or more':'Select one')+'</div>';

    opts.forEach(function(opt,i){
      var oid = pid+'_'+i;
      html += '<div style="margin-bottom:10px;cursor:pointer;-webkit-tap-highlight-color:transparent" onclick="_pollVote(\''+pid+'\','+i+','+opts.length+',\''+voteKey+'\')">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">' +
          '<div id="'+oid+'_c" data-v="0" style="width:20px;height:20px;border-radius:50%;border:2px solid rgba(255,255,255,.35);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s"></div>' +
          '<span style="flex:1;font-size:13.5px;color:#e9edef;line-height:1.35;word-break:break-word;overflow-wrap:break-word;min-width:0">'+esc(opt)+'</span>' +
          '<span id="'+oid+'_p" style="color:rgba(255,255,255,.6);font-size:13px;font-weight:700;min-width:32px;text-align:right;flex-shrink:0">0%</span>' +
        '</div>' +
        '<div style="height:5px;background:rgba(255,255,255,.08);border-radius:3px;overflow:hidden">' +
          '<div id="'+oid+'_b" style="height:100%;background:linear-gradient(90deg,#9333ea,#ec4899);border-radius:3px;width:0;transition:width .4s ease"></div>' +
        '</div>' +
      '</div>';
    });

    html += '<div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.1);margin-top:8px;padding-top:10px">' +
      '<span id="'+pid+'_total" style="color:rgba(255,255,255,.4);font-size:12px">0 votes</span>' +
      '<span onclick="_showPollVotes(\''+pid+'\',\''+voteKey+'\','+opts.length+')" style="color:#a78bfa;font-size:13px;cursor:pointer;font-weight:700">View votes →</span>' +
    '</div></div>';

    // Auto-load votes on mount
    setTimeout(function(){ if(window._reloadPollUI) window._reloadPollUI(pid, opts.length, voteKey); }, 200);

    // Install handlers once
    if (!window._pollVote) {
      window._pollVote = function(pid,idx,tot,msgId){
        if (!window._myVotes) window._myVotes = {};
        var prev = window._myVotes[msgId];
        var newV = (prev===idx) ? null : idx;
        window._myVotes[msgId] = newV;
        if (typeof db!=='undefined' && msgId && typeof currentUser!=='undefined' && currentUser) {
          if (newV===null) db.ref('poll_votes/'+msgId+'/'+currentUser.uid).remove();
          else db.ref('poll_votes/'+msgId+'/'+currentUser.uid).set(newV);
        }
        window._reloadPollUI(pid,tot,msgId);
      };
      window._reloadPollUI = function(pid,tot,msgId){
        if (typeof db==='undefined'||!msgId) return;
        db.ref('poll_votes/'+msgId).once('value').then(function(s){
          var counts={},myVote=null;
          s.forEach(function(c){ var v=c.val(); counts[v]=(counts[v]||0)+1; if(typeof currentUser!=='undefined'&&currentUser&&c.key===currentUser.uid)myVote=v; });
          var total=Object.values(counts).reduce(function(a,b){return a+b;},0);
          var totalEl=document.getElementById(pid+'_total');
          if(totalEl)totalEl.textContent=total+(total===1?' vote':' votes');
          for(var i=0;i<tot;i++){
            var cc=document.getElementById(pid+'_'+i+'_c'),bb=document.getElementById(pid+'_'+i+'_b'),pp=document.getElementById(pid+'_'+i+'_p');
            var cnt=counts[i]||0, pct=total>0?Math.round(cnt/total*100):0, voted=(myVote===i);
            if(cc){cc.innerHTML=voted?'<svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polyline points="20 6 9 17 4 12"/></svg>':'';cc.style.background=voted?'linear-gradient(135deg,#9333ea,#ec4899)':'transparent';cc.style.borderColor=voted?'transparent':'rgba(255,255,255,.35)';cc.dataset.v=voted?'1':'0';}
            if(bb)bb.style.width=pct+'%';
            if(pp)pp.textContent=pct+'%';
          }
          if(!window._myVotes)window._myVotes={};
          window._myVotes[msgId]=myVote;
        });
      };
      window._showPollVotes = function(pid,msgId,tot){
        if(typeof db==='undefined'||!msgId){if(typeof showToast==='function')showToast('No votes data');return;}
        db.ref('poll_votes/'+msgId).once('value').then(function(s){
          var voters=[];s.forEach(function(c){voters.push({uid:c.key,opt:c.val()});});
          if(!voters.length){if(typeof showToast==='function')showToast('No votes yet');return;}
          var ov=document.createElement('div');ov.id='_pvOv';ov.style.cssText='position:fixed;inset:0;z-index:9900;background:#0d1117;display:flex;flex-direction:column';
          var p=document.createElement('div');p.style.cssText='background:#1a1f2e;width:100%;flex:1;display:flex;flex-direction:column;overflow:hidden';
          p.innerHTML='<div style="text-align:center;padding:10px 0 4px"><div style="width:36px;height:4px;background:#374151;border-radius:2px;margin:0 auto"></div></div>'+
            '<div style="padding:12px 16px;border-bottom:1px solid #2a3942;font-weight:700;font-size:16px;color:#fff">Poll votes · '+voters.length+'</div>'+
            '<div id="_pvList" style="overflow-y:auto;flex:1;padding:8px 0"></div>'+
            '<button onclick="document.getElementById(\'_pvOv\').remove()" style="margin:10px 16px 24px;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:14px;color:#fff;font-weight:700;font-size:15px;padding:13px;cursor:pointer">Close</button>';
          ov.appendChild(p);document.body.appendChild(ov);
          ov.onclick=function(e){if(e.target===ov)ov.remove();};
          var list=document.getElementById('_pvList'); if(!list)return;
          var nc=window._reactNameCache||{};window._reactNameCache=nc;
          voters.forEach(function(v){
            var render=function(name){
              var r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid rgba(55,65,81,.3)';
              r.innerHTML='<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px">'+(name[0]||'?').toUpperCase()+'</div>'+
                '<span style="flex:1;font-size:14px;font-weight:600;color:#fff">'+(typeof currentUser!=='undefined'&&currentUser&&v.uid===currentUser.uid?name+' (You)':name)+'</span>'+
                '<span style="font-size:12px;color:#8696a0">Option '+(v.opt+1)+'</span>';
              list.appendChild(r);
            };
            if(nc[v.uid]){render(nc[v.uid]);return;}
            db.ref('users/'+v.uid+'/name').once('value').then(function(s){nc[v.uid]=s.val()||v.uid.substring(0,10);render(nc[v.uid]);}).catch(function(){render(v.uid.substring(0,10));});
          });
        });
      };
    }

    setTimeout(function(){ if(msgId&&typeof db!=='undefined')window._reloadPollUI(pid,opts.length,msgId); },300);
    return html;
  }

  // ── EVENT ──────────────────────────────────────────────────────────────────
  if (/^📅 \*Event:\*/.test(rawText)) {
    var el = rawText.split('\n');
    var et = el[0].replace(/^📅 \*Event:\*\s*/,'');
    var eDesc='',eTime='',eLoc='',eIso='',eIsoEnd='',eRemind='';
    el.slice(1).forEach(function(l){
      if(l.startsWith('📝 '))eDesc=l.slice(3);
      else if(l.startsWith('🕐 '))eTime=l.slice(3);
      else if(l.startsWith('📍 '))eLoc=l.slice(3);
      else if(l.startsWith('⏱iso:'))eIso=l.slice(6);
      else if(l.startsWith('⏱isoend:'))eIsoEnd=l.slice(9);
      else if(l.startsWith('🔔 Reminder: '))eRemind=l.slice(13);
    });

    // Build Google Calendar URL from ISO datetime
    var calUrl='#';
    try{
      var dtSrc = eIso || eTime;
      if(dtSrc){
        var dt=new Date(dtSrc);
        if(!isNaN(dt.getTime())){
          var fmtCal=function(d){return d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');};
          var dtEnd=eIsoEnd?new Date(eIsoEnd):new Date(dt.getTime()+3600000);
          calUrl='https://calendar.google.com/calendar/render?action=TEMPLATE&text='+encodeURIComponent(et)+'&dates='+fmtCal(dt)+'/'+fmtCal(dtEnd)+(eLoc?'&location='+encodeURIComponent(eLoc):'')+(eDesc?'&details='+encodeURIComponent(eDesc):'');
        }
      }
    }catch(e){}

    // Store prefill in a global map — safer than inline JSON attribute
    if (!window._evtPrefills) window._evtPrefills = {};
    window._evtPrefills[pid] = {title:et,desc:eDesc,dt:eIso,endDt:eIsoEnd,loc:eLoc,msgId:msgId};

    return '<div style="width:100%;max-width:100%;box-sizing:border-box">' +
      '<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">' +
        '<div style="width:46px;height:46px;background:linear-gradient(135deg,#9333ea,#ec4899);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📅</div>' +
        '<div style="flex:1;min-width:0;overflow:hidden">' +
          '<div style="font-weight:700;font-size:14px;color:#fff;line-height:1.35;word-break:break-word;overflow-wrap:break-word">'+esc(et)+'</div>' +
          (eTime?'<div style="color:rgba(255,255,255,.55);font-size:12px;margin-top:3px;word-break:break-word">🕐 '+esc(eTime)+'</div>':'') +
          (eDesc?'<div style="color:rgba(255,255,255,.4);font-size:12px;margin-top:2px;word-break:break-word">'+esc(eDesc)+'</div>':'') +
          (eLoc?'<div style="color:rgba(255,255,255,.4);font-size:12px;word-break:break-word">📍 '+esc(eLoc)+'</div>':'') +
          '<div style="display:flex;align-items:center;gap:5px;margin-top:5px;color:rgba(255,255,255,.4);font-size:11px">' +
            '<div style="width:17px;height:17px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);font-size:9px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0">1</div>' +
            '1 going' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="border-top:1px solid rgba(255,255,255,.1);margin-top:4px;display:flex">' +
        '<div onclick="if(typeof _openEvent===\'function\')_openEvent(window._evtPrefills&&window._evtPrefills[\''+pid+'\']||{})" style="flex:1;text-align:center;color:#a78bfa;font-size:13px;font-weight:600;padding:9px 4px;cursor:pointer;border-right:1px solid rgba(255,255,255,.1);-webkit-tap-highlight-color:transparent;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">✏️ Edit</div>' +
        '<a href="'+calUrl+'" target="_blank" style="flex:1;text-align:center;color:#a78bfa;font-size:13px;font-weight:600;padding:9px 4px;text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📆 Calendar</a>' +
      '</div>' +
    '</div>';
  }

  // ── CONTACT ────────────────────────────────────────────────────────────────
  if (/^👤 \*Contact:\*/.test(rawText)) {
    var cl = rawText.split('\n');
    var cn = cl[0].replace(/^👤 \*Contact:\*\s*/,'');
    var cp='',ce='';
    cl.slice(1).forEach(function(l){ if(l.startsWith('📞 '))cp=l.slice(3); else if(l.startsWith('📧 '))ce=l.slice(3); });
    var ci=(cn[0]||'?').toUpperCase();
    var colors=['#ec4899','#8b5cf6','#3b82f6','#10b981','#f59e0b'];
    var clr=colors[cn.charCodeAt(0)%colors.length];
    return '<div style="width:100%;max-width:100%;box-sizing:border-box">' +
      '<div style="display:flex;align-items:center;gap:12px;padding-bottom:12px">' +
        '<div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,'+clr+',#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;color:#fff;flex-shrink:0;box-shadow:0 4px 14px rgba(0,0,0,.3)">'+ci+'</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:15px;color:#fff;word-break:break-word">'+esc(cn)+'</div>'+(cp?'<div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:3px;word-break:break-word">📞 '+esc(cp)+'</div>':'')+(ce?'<div style="color:rgba(255,255,255,.5);font-size:12px;margin-top:2px;word-break:break-word">'+esc(ce)+'</div>':'')+'</div>' +
      '</div>' +
      '<div style="border-top:1px solid rgba(255,255,255,.12);display:flex">' +
        (cp?'<a href="tel:'+cp+'" style="flex:1;text-align:center;color:#a78bfa;font-size:13px;font-weight:600;text-decoration:none;padding:9px 4px;border-right:1px solid rgba(255,255,255,.1);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📞 Call</a>':'') +
        '<div onclick="_contactMsgUser(\''+esc(cn)+'\')" style="flex:1;text-align:center;color:#a78bfa;font-size:13px;font-weight:600;cursor:pointer;padding:9px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;-webkit-tap-highlight-color:transparent">💬 Message</div>' +
      '</div>' +
    '</div>';
  }

  // ── LOCATION ───────────────────────────────────────────────────────────────
  if (/^📍 Location: https?:/.test(rawText)) {
    var lu=rawText.replace('📍 Location: ','').trim();
    var cm=lu.match(/[?&]q=([-\d.]+),([-\d.]+)/);
    var la=cm?cm[1]:'',lo=cm?cm[2]:'';
    var _luSafe = lu.replace(/"/g,'&quot;');
    return '<div style="width:100%;max-width:100%;box-sizing:border-box">' +
      // Map preview tappable — opens full map. pointer-events on children disabled so tap hits this div.
      '<div data-mapurl="'+_luSafe+'" onclick="var u=this.getAttribute(\'data-mapurl\');if(u)window.open(u,\'_blank\')" style="height:120px;background:#0d1117;border-radius:12px;overflow:hidden;margin-bottom:10px;position:relative;cursor:pointer;-webkit-tap-highlight-color:transparent">' +
        (la?'<iframe src="https://www.openstreetmap.org/export/embed.html?bbox='+(parseFloat(lo)-0.003)+','+(parseFloat(la)-0.002)+','+(parseFloat(lo)+0.003)+','+(parseFloat(la)+0.002)+'&layer=mapnik&marker='+la+','+lo+'" style="width:100%;height:100%;border:none;pointer-events:none" scrolling="no"></iframe>':'<div style="height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;pointer-events:none">🗺️</div>') +
        // Zoom +/- badges — visual only, tap opens full map
        '<div style="position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:3px;pointer-events:none">' +
          '<div style="width:26px;height:26px;background:rgba(0,0,0,.6);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;backdrop-filter:blur(4px)">+</div>' +
          '<div style="width:26px;height:26px;background:rgba(0,0,0,.6);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;backdrop-filter:blur(4px)">−</div>' +
        '</div>' +
        '<div style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center"><div style="width:18px;height:18px;background:linear-gradient(135deg,#9333ea,#ec4899);border-radius:50%;border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.7)"></div></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
        '<div style="flex:1;min-width:0"><p style="font-size:14px;font-weight:700;color:#fff;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📍 My Location</p>'+(la?'<p style="font-size:11px;color:rgba(255,255,255,.4);margin:2px 0 0">'+la+', '+lo+'</p>':'')+'</div>' +
        '<a href="'+lu+'" target="_blank" style="background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;font-size:12px;font-weight:700;text-decoration:none;padding:7px 12px;border-radius:16px;flex-shrink:0">Open ↗</a>' +
      '</div>' +
    '</div>';
  }

  return '';
}

function openPrivateChatByName(name) {
  if (!currentUser) { if(typeof showToast==='function') showToast('Please sign in first'); return; }
  var nameLower = name.toLowerCase();

  function matchName(fullName) {
    var fl = (fullName||'').toLowerCase();
    var first = fl.split(' ')[0];
    return fl === nameLower || first === nameLower || fl.includes(nameLower);
  }

  function navigate(uid, uname) {
    // Detect if current page is inside pages/ folder to use correct relative URL
    var inPages = window.location.pathname.indexOf('/pages/') !== -1;
    var base = inPages ? 'chatroom.html' : 'pages/chatroom.html';
    window.location.href = base + '?uid=' + uid + '&name=' + encodeURIComponent(uname);
  }

  // 1. Try the already-loaded mention users cache (no Firebase read needed)
  var cached = window._mentionUsers || [];
  for (var i = 0; i < cached.length; i++) {
    if (matchName(cached[i].name)) { navigate(cached[i].uid, cached[i].name); return; }
  }

  // 2. Fallback: query Firebase (requires auth != null on users node in rules)
  if (typeof db === 'undefined') { if(typeof showToast==='function') showToast('DB not ready'); return; }
  db.ref('users').once('value').then(function(snap) {
    var found = null;
    snap.forEach(function(c) {
      if (c.key === currentUser.uid) return;
      if (!found && matchName(c.val().name)) found = { uid: c.key, name: c.val().name || name };
    });
    if (found) navigate(found.uid, found.name);
    else if(typeof showToast==='function') showToast('@' + name + ' — user not found in app');
  }).catch(function(err) {
    if(typeof showToast==='function') showToast('Cannot read users: update Firebase rules');
    console.error('openPrivateChatByName:', err);
  });
}

// ── Send @mention notification ────────────────────────────────────────────────
function sendMentionNotification(mentionedName, senderName, messageText) {
  if (typeof db === 'undefined') return;
  db.ref('users').once('value').then(function(snap) {
    snap.forEach(function(c) {
      var v = c.val();
      if ((v.name||'').toLowerCase() === mentionedName.toLowerCase()) {
        var notifRef = db.ref('notifications/' + c.key).push();
        notifRef.set({
          type: 'mention',
          from: senderName,
          message: senderName + ' tagged you: "' + messageText.substring(0, 80) + '"',
          msgText: messageText, // store full text so we can scroll to it
          read: false,
          ts: Date.now()
        });
      }
    });
  });
}

// ── Instant download (no browser redirect) ───────────────────────────────────
window._instantDL = function(url, filename) {
  if (typeof showToast === 'function') showToast('Downloading...');
  fetch(url)
    .then(function(r) { return r.blob(); })
    .then(function(blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || 'file';
      document.body.appendChild(a); a.click();
      setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
      if (typeof showToast === 'function') showToast('Downloaded! ✓');
    })
    .catch(function() {
      var a = document.createElement('a');
      a.href = url; a.download = filename || 'file'; a.target = '_blank';
      document.body.appendChild(a); a.click();
      setTimeout(function() { document.body.removeChild(a); }, 500);
    });
};

// ── Notification bell — shows @mentions and alerts ───────────────────────────
function loadNotificationBell(uid) {
  if (!uid || typeof db === 'undefined') return;
  var bell = document.getElementById('notifBell');
  if (!bell) return;
  db.ref('notifications/' + uid).on('value', function(snap) {
    var unread = 0;
    snap.forEach(function(c) { if (!c.val().read) unread++; });
    var badge = bell.querySelector('._notifBadge');
    if (unread > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = '_notifBadge';
        badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;font-size:10px;font-weight:700;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px;line-height:1';
        bell.style.position = 'relative';
        bell.appendChild(badge);
      }
      badge.textContent = unread > 9 ? '9+' : unread;
    } else if (badge) {
      badge.remove();
    }
  });
  bell.onclick = function() { showNotificationsPanel(uid); };
}

function showNotificationsPanel(uid) {
  var ex = document.getElementById('_notifPanel'); if (ex) { ex.remove(); return; }
  var d = document.createElement('div');
  d.id = '_notifPanel';
  d.style.cssText = 'position:fixed;inset:0;z-index:9800;background:rgba(0,0,0,.6);display:flex;flex-direction:column;justify-content:flex-end';
  d.innerHTML = '<div style="background:#1a1f2e;border-radius:20px 20px 0 0;max-height:70vh;display:flex;flex-direction:column">' +
    '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid #2a3942;flex-shrink:0">' +
      '<span style="font-size:20px">🔔</span>' +
      '<span style="color:#fff;font-weight:700;font-size:16px;flex:1">Notifications</span>' +
      '<button onclick="var _np=document.getElementById(\'_notifPanel\');if(_np)_np.remove();" style="background:none;border:none;color:#6b7280;font-size:22px;cursor:pointer">✕</button>' +
    '</div>' +
    '<div id="_notifList" style="overflow-y:auto;flex:1;padding:8px 0"><div style="text-align:center;padding:24px;color:#6b7280">Loading...</div></div>' +
    '<div style="padding:12px 16px 28px;flex-shrink:0">' +
      '<button onclick="db.ref(\'notifications/\'+\''+uid+'\').once(\'value\').then(function(s){s.forEach(function(c){db.ref(\'notifications/'+uid+'/\'+c.key+\'/read\').set(true);})});document.getElementById(\'_notifPanel\').remove()" style="width:100%;background:#2a3942;border:none;border-radius:14px;color:#9ca3af;font-size:14px;font-weight:600;padding:12px;cursor:pointer">Mark all as read</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(d);
  d.addEventListener('click', function(e){ if(e.target===d) d.remove(); });

  db.ref('notifications/' + uid).orderByChild('ts').limitToLast(30).once('value').then(function(snap) {
    var items = [];
    snap.forEach(function(c) { items.unshift({key:c.key, val:c.val()}); });
    var list = document.getElementById('_notifList');
    if (!list) return;
    if (!items.length) { list.innerHTML='<div style="text-align:center;padding:24px;color:#6b7280">No notifications yet</div>'; return; }
    list.innerHTML = items.map(function(it) {
      var v = it.val;
      var ago = _timeAgoShort(v.ts);
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(55,65,81,.3);cursor:pointer;background:'+(v.read?'none':'rgba(147,51,234,.08)')+'" onclick="db.ref(\'notifications/'+uid+'/'+it.key+'/read\').set(true);this.style.background=\'none\'">' +
        '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">' +
          (v.type==='mention'?'@':'🔔') +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<p style="color:#fff;font-size:14px;font-weight:'+(v.read?'400':'700')+';margin:0 0 3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (v.message||'New notification') + '</p>' +
          '<p style="color:#6b7280;font-size:12px;margin:0">' + ago + '</p>' +
        '</div>' +
        (!v.read?'<div style="width:8px;height:8px;border-radius:50%;background:#ec4899;flex-shrink:0;margin-top:6px"></div>':'') +
      '</div>';
    }).join('');
  });
}

function _timeAgoShort(ts) {
  var d = Date.now() - ts;
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d/60000) + 'm ago';
  if (d < 86400000) return Math.floor(d/3600000) + 'h ago';
  return Math.floor(d/86400000) + 'd ago';
}
function showFilePreview(file, onSend) {
  var ex = document.getElementById('filePreviewOv'); if(ex) ex.remove();
  var _viewOnce = false;
  var _caption = '';
  var objUrl = URL.createObjectURL(file);
  var isImg = file.type.startsWith('image/');
  var isVid = file.type.startsWith('video/');
  var ov = document.createElement('div');
  ov.id = 'filePreviewOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99990;background:#111;display:flex;flex-direction:column;font-family:-apple-system,sans-serif;overscroll-behavior:none';

  /* ─── Top toolbar ─── */
  var toolbar = document.createElement('div');
  toolbar.style.cssText = 'flex-shrink:0;display:flex;align-items:center;padding:10px 12px;gap:10px;background:rgba(0,0,0,.55);backdrop-filter:blur(6px)';
  toolbar.innerHTML =
    /* Close */
    '<button id="_fp_close" style="width:42px;height:42px;background:rgba(255,255,255,.15);border:none;border-radius:50%;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">✕</button>' +
    '<div style="flex:1"></div>' +
    /* Download */
    '<button id="_fp_dl" title="Save" style="width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M12 3v13M5 16l7 7 7-7"/><path d="M3 21h18"/></svg>' +
    '</button>' +
    /* HD (video only) */
    (isVid ? '<button id="_fp_hd" style="width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;cursor:pointer;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">HD</button>' : '') +
    /* Rotate/Crop (images only) */
    (isImg ? '<button id="_fp_rot" title="Rotate" style="width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M22 12A10 10 0 0 0 2 12"/><polyline points="2 7 2 12 7 12"/><polyline points="22 17 22 12 17 12"/></svg>' +
    '</button>' : '') +
    /* Emoji/Sticker */
    '<button id="_fp_emoji" title="Add emoji" style="width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
      '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' +
    '</button>' +
    /* Text (Aa) */
    '<button id="_fp_txt" title="Add text" style="width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;cursor:pointer;color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center">Aa</button>' +
    /* Draw */
    '<button id="_fp_draw" title="Draw" style="width:40px;height:40px;background:rgba(255,255,255,.15);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
    '</button>';
  ov.appendChild(toolbar);

  /* ─── Video filmstrip ─── */
  if (isVid) {
    var strip = document.createElement('div');
    strip.style.cssText = 'flex-shrink:0;padding:4px 8px;background:#000;overflow-x:auto;display:flex;gap:3px';
    strip.id = '_fp_strip';
    ov.appendChild(strip);
  }

  /* ─── Preview area ─── */
  var preview = document.createElement('div');
  preview.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;background:#000;overflow:hidden;position:relative';
  var _rot = 0;
  if (isImg) {
    var img = document.createElement('img');
    img.id = '_fp_img';
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;transition:transform .3s';
    img.src = objUrl; preview.appendChild(img);
  } else if (isVid) {
    var vid = document.createElement('video');
    vid.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain';
    vid.muted = true; vid.autoplay = true; vid.src = objUrl; vid.playsInline = true;
    vid.controls = true; preview.appendChild(vid);
    /* Generate filmstrip thumbnails after metadata loads */
    vid.addEventListener('loadedmetadata', function() {
      var strip2 = document.getElementById('_fp_strip'); if(!strip2) return;
      var dur = vid.duration; if(!dur || dur > 300) return;
      var count = Math.min(Math.floor(dur), 8);
      var cvs2 = document.createElement('canvas'); cvs2.width=60; cvs2.height=40;
      var ctx2 = cvs2.getContext('2d');
      (function _nextFrame(i) {
        if(i>=count) return;
        var tmpVid = document.createElement('video');
        tmpVid.src = objUrl; tmpVid.muted=true;
        tmpVid.onloadedmetadata = function(){ tmpVid.currentTime = (i/count)*dur; };
        tmpVid.onseeked = function(){
          try { ctx2.drawImage(tmpVid,0,0,60,40); strip2.innerHTML += '<div style="width:60px;height:40px;flex-shrink:0;border-radius:4px;overflow:hidden;background:#1a1f2e"><img src="'+cvs2.toDataURL()+'" style="width:100%;height:100%;object-fit:cover"></div>'; } catch(e){}
          _nextFrame(i+1);
        };
        tmpVid.load();
      })(0);
    });
  } else {
    var ext2 = (file.name.split('.').pop()||'').toUpperCase();
    var ic2 = ext2==='PDF'?'📄':ext2==='DOC'||ext2==='DOCX'?'📝':ext2==='XLS'||ext2==='XLSX'?'📊':'📎';
    preview.innerHTML = '<div style="text-align:center;color:#e9edef;padding:32px"><div style="font-size:72px">'+ic2+'</div><p style="font-size:16px;font-weight:700;margin:10px 0 0">'+file.name+'</p></div>';
  }
  ov.appendChild(preview);

  /* ─── Bottom caption bar ─── */
  var capBar = document.createElement('div');
  capBar.style.cssText = 'flex-shrink:0;background:rgba(17,24,39,.95);padding:10px 12px;display:flex;align-items:center;gap:8px';
  var capInput = document.createElement('input');
  capInput.type = 'text'; capInput.placeholder = 'Add a caption…';
  capInput.style.cssText = 'flex:1;background:#1f2937;border:none;border-radius:24px;color:#e9edef;padding:10px 16px;font-size:14px;outline:none;font-family:inherit;caret-color:#ec4899';
  /* View-once icon */
  var voBtn = document.createElement('button');
  voBtn.id = '_fp_vo';
  voBtn.title = 'View once';
  voBtn.style.cssText = 'width:42px;height:42px;background:rgba(255,255,255,.1);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;transition:background .2s';
  voBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="10" stroke="rgba(255,255,255,0.7)" stroke-width="2.2"/><line x1="13" y1="7.5" x2="13" y2="13" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/><line x1="13" y1="13" x2="16.5" y2="15.5" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="5" r="4" fill="#8b5cf6"/><text x="22" y="8" text-anchor="middle" font-size="6" fill="#fff" font-weight="900" font-family="Arial">1</text></svg>';
  /* Send button */
  var sendBtn = document.createElement('button');
  sendBtn.style.cssText = 'width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 12px rgba(236,72,153,.5)';
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:white"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"/></svg>';
  capBar.appendChild(capInput); capBar.appendChild(voBtn); capBar.appendChild(sendBtn);
  ov.appendChild(capBar);
  document.body.appendChild(ov);

  /* ─── View-once info tooltip ─── */
  function _showVOInfo() {
    var tip = document.createElement('div');
    tip.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1f2937;border:1px solid #374151;border-radius:12px;padding:10px 16px;color:#fff;font-size:13px;z-index:99999;max-width:280px;text-align:center;pointer-events:none;animation:fadeIn .2s';
    tip.textContent = _viewOnce ? '👁 View once ON — recipient can only open once' : 'View once OFF — normal message';
    document.body.appendChild(tip);
    setTimeout(function(){ tip.style.opacity='0'; tip.style.transition='opacity .4s'; setTimeout(function(){ tip.remove(); },400); }, 2200);
  }

  /* ─── Button wiring ─── */
  document.getElementById('_fp_close').onclick = function(){ URL.revokeObjectURL(objUrl); ov.remove(); };

  document.getElementById('_fp_dl').onclick = function() {
    var a = document.createElement('a'); a.href=objUrl; a.download=file.name||'file';
    document.body.appendChild(a); a.click(); setTimeout(function(){ a.remove(); },500);
  };

  if(isImg) {
    document.getElementById('_fp_rot').onclick = function() {
      _rot = (_rot+90)%360;
      var imgEl = document.getElementById('_fp_img');
      if(imgEl) imgEl.style.transform = 'rotate('+_rot+'deg)';
    };
  }

  document.getElementById('_fp_emoji').onclick = function() {
    if(typeof showToast==='function') showToast('Emoji stickers coming soon 🔜');
  };
  document.getElementById('_fp_txt').onclick = function() {
    if(typeof showToast==='function') showToast('Text overlay coming soon 🔜');
  };
  document.getElementById('_fp_draw').onclick = function() {
    if(typeof showToast==='function') showToast('Drawing coming soon 🔜');
  };

  voBtn.onclick = function() {
    _viewOnce = !_viewOnce;
    voBtn.style.background = _viewOnce ? 'linear-gradient(135deg,#9333ea,#ec4899)' : 'rgba(255,255,255,.1)';
    _showVOInfo();
  };

  sendBtn.onclick = function() {
    var cap = capInput.value.trim();
    URL.revokeObjectURL(objUrl);
    ov.remove();
    onSend(file, cap, _viewOnce);
  };
  capInput.addEventListener('keydown', function(e){ if(e.key==='Enter') sendBtn.click(); });
  setTimeout(function(){ capInput.focus(); }, 300);
}

