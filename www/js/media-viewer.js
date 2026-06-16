/**
 * PHYSIO SUAI – Media Viewer r42
 * Fullscreen video player · Sticker save sheet · Create sticker · Reply highlight
 */
(function(G) {
'use strict';

/* ── Sticker Favorites (uses same key as emoji-panel) ─────────────────── */
var _FAV_KEY = '_wsFav6';
function _loadFavs() {
  try { return JSON.parse(localStorage.getItem(_FAV_KEY)||'[]'); } catch(e) { return []; }
}
function _saveFavs(arr) {
  try { localStorage.setItem(_FAV_KEY, JSON.stringify(arr.slice(0,48))); } catch(e) {}
}
function _addFav(src, label) {
  if (!src) return false;
  var favs = _loadFavs();
  if (favs.some(function(f){ return f.src===src; })) return false;
  favs.unshift({ src:src, label:label||'My Sticker', pack:'fav' });
  _saveFavs(favs);
  return true;
}
function _removeFav(src) {
  _saveFavs(_loadFavs().filter(function(f){ return f.src!==src; }));
}
function _isFav(src) {
  return _loadFavs().some(function(f){ return f.src===src; });
}

/* ── CSS injection ─────────────────────────────────────────────────────── */
function _injectCSS() {
  if (document.getElementById('_mvCSS')) return;
  var s = document.createElement('style'); s.id = '_mvCSS';
  s.textContent = [
    '@keyframes _mvUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}',
    '@keyframes _mvIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}',
    '@keyframes _mvReact{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}',
    '._mvSheet{animation:_mvUp .22s cubic-bezier(.4,0,.2,1)}',
    '._mvOptBtn{display:flex;align-items:center;gap:16px;width:100%;padding:15px 20px;background:none;border:none;cursor:pointer;font-size:15px;font-weight:500;text-align:left;-webkit-tap-highlight-color:transparent;transition:background .12s}',
    '._mvOptBtn:active{background:rgba(255,255,255,.07)}',
    '#_vpScrub{-webkit-appearance:none;width:100%;height:20px;background:transparent;cursor:pointer;outline:none}',
    '#_vpScrub::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;margin-top:-7px;box-shadow:0 1px 6px rgba(0,0,0,.5)}',
    '#_vpScrub::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:transparent}'
  ].join('\n');
  document.head.appendChild(s);
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;'); }
function _fmt(s) { s=Math.floor(s||0); var m=Math.floor(s/60),sec=s%60; return m+':'+(sec<10?'0':'')+sec; }
function _ago(ts) {
  var s=Math.floor((Date.now()-ts)/1000);
  if(s<60) return 'just now';
  if(s<3600) return Math.floor(s/60)+'m ago';
  if(s<86400) return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}
function _safeId(s) { return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'_'); }

/* ── Callbacks registry (set by pages for each video message) ──────────── */
G._vpCbs = {};

/* ═══════════════════════════════════════════════════════════════════════
   BUILD INLINE VIDEO HTML — thumbnail shows first frame reliably
═══════════════════════════════════════════════════════════════════════ */
G.buildInlineVideoHtml = function(url, msgId, senderName, ts, isMine) {
  var sid = _safeId(msgId);
  // Android WebView fix: use onseeked (fires reliably after seek) instead of oncanplay
  // to show the first frame — onseeked fires after currentTime is actually decoded & painted
  return '<div data-vid-msg="'+_esc(msgId)+'" data-vid-url="'+_esc(url)+'" data-vid-sender="'+_esc(senderName||'')+'" data-vid-ts="'+(ts||0)+'" data-vid-mine="'+(isMine?'1':'0')+'" '+
    'onclick="(function(el){openVideoPlayer(el.dataset.vidMsg,el.dataset.vidUrl,el.dataset.vidSender,+el.dataset.vidTs,el.dataset.vidMine===\'1\')})(this)" '+
    'style="max-width:220px;border-radius:10px;overflow:hidden;margin-top:6px;position:relative;cursor:pointer;background:#1a1a2e;display:inline-block;-webkit-tap-highlight-color:transparent">'+
    '<video id="_vthumb_'+sid+'" src="'+_esc(url)+'" preload="auto" muted playsinline webkit-playsinline style="width:220px;max-width:100%;display:none;max-height:200px;object-fit:cover;position:relative;z-index:2" '+
      'onloadedmetadata="(function(v){'+
        'v.currentTime=0.001;'+
        'var d=Math.floor(v.duration||0);'+
        'var e=document.getElementById(\'_vd_'+sid+'\');'+
        'if(e){var m=Math.floor(d/60),s=d%60;e.textContent=m+\':\'+(s<10?\'0\':\'\')+s;}'+
      '})(this)" '+
      'onseeked="(function(v){v.style.display=\'block\';var fb=document.getElementById(\'_vfb_'+sid+'\');if(fb)fb.style.display=\'none\';})(this)" '+
      'oncanplay="(function(v){v.style.display=\'block\';var fb=document.getElementById(\'_vfb_'+sid+'\');if(fb)fb.style.display=\'none\';})(this)"></video>'+
    // Fallback shown while loading — z-index:1 so video (z-index:2) always covers it
    '<div id="_vfb_'+sid+'" style="position:absolute;inset:0;z-index:1;background:#1a1f2e;display:flex;align-items:center;justify-content:center;min-height:150px">'+
      '<div style="width:40px;height:40px;border:3px solid rgba(255,255,255,.2);border-top-color:#ec4899;border-radius:50%;animation:spin 1s linear infinite"></div>'+
    '</div>'+
    '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>'+
    '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none">'+
      '<div style="width:50px;height:50px;border-radius:50%;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.5)">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>'+
      '</div>'+
    '</div>'+
    '<div style="position:absolute;bottom:6px;left:6px;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.65);border-radius:8px;padding:3px 8px;pointer-events:none">'+
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>'+
      '<span id="_vd_'+sid+'" style="color:#fff;font-size:11px;font-weight:700">--:--</span>'+
    '</div>'+
  '</div>';
};

/* ═══════════════════════════════════════════════════════════════════════
   STICKER HTML — tappable sticker with save sheet onclick
═══════════════════════════════════════════════════════════════════════ */
G.buildStickerHtml = function(url, msgId, senderName, isMine, size) {
  size = size || 160;
  return '<div data-stk-src="'+_esc(url)+'" data-stk-msg="'+_esc(msgId||'')+'" data-stk-mine="'+(isMine?'1':'0')+'" '+
    'onclick="(function(el){openStickerSheet(el.dataset.stkSrc,\'Sticker\',\'Physio SUAI Stickers\',el.dataset.stkMsg,el.dataset.stkMine===\'1\')})(this)" '+
    'style="display:inline-block;margin:2px 0;cursor:pointer;-webkit-tap-highlight-color:transparent">'+
    '<img src="'+_esc(url)+'" data-orig="'+_esc(url)+'" '+
      'style="width:'+size+'px;height:'+size+'px;object-fit:contain;display:block;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5));border-radius:4px" '+
      'loading="eager" '+
      'onload="if(typeof _preCacheImg===\'function\')_preCacheImg(this.getAttribute(\'data-orig\')||this.src)" '+
      'onerror="if(typeof _stkImgErr===\'function\')_stkImgErr(this)">'+
  '</div>';
};

/* ═══════════════════════════════════════════════════════════════════════
   STICKER SAVE SHEET
═══════════════════════════════════════════════════════════════════════ */
G.openStickerSheet = function(src, label, packName, msgId, isMine) {
  _injectCSS();
  var ex = document.getElementById('_stkSheet'); if (ex) { ex.remove(); return; }
  var isFav = _isFav(src);

  var ov = document.createElement('div');
  ov.id = '_stkSheet';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });

  var sheet = document.createElement('div');
  sheet.className = '_mvSheet';
  sheet.style.cssText = 'width:100%;max-width:520px;background:#1a1f2e;border-radius:24px 24px 0 0;overflow:hidden;padding-bottom:env(safe-area-inset-bottom)';
  sheet.innerHTML =
    '<div style="display:flex;justify-content:center;padding:12px 0 4px"><div style="width:36px;height:4px;background:#374151;border-radius:2px"></div></div>'+
    // Sticker preview
    '<div style="display:flex;flex-direction:column;align-items:center;padding:16px 20px 14px;border-bottom:1px solid rgba(255,255,255,.07)">'+
      '<div style="width:130px;height:130px;display:flex;align-items:center;justify-content:center">'+
        '<img src="'+_esc(src)+'" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:10px" onerror="this.style.opacity=.3">'+
      '</div>'+
      '<p style="color:#8696a0;font-size:13px;margin:10px 0 0;font-weight:600">'+_esc(packName||'Physio SUAI Stickers')+'</p>'+
    '</div>'+
    // Options
    '<button id="_stkFavBtn" class="_mvOptBtn" style="color:'+(isFav?'#fbbf24':'#e9edef')+';border-bottom:1px solid rgba(255,255,255,.05)">'+
      '<span style="width:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+(isFav?
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>':
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e9edef" stroke-width="1.8" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>')+'</span>'+
      '<span>'+(isFav?'Saved to Favorites':'Add to Favorites')+'</span>'+
    '</button>'+
    '<button id="_stkPackBtn" class="_mvOptBtn" style="color:#e9edef;border-bottom:1px solid rgba(255,255,255,.05)">'+
      '<span style="width:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e9edef" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><line x1="10" y1="17.5" x2="14" y2="17.5"/><line x1="12" y1="15.5" x2="12" y2="19.5"/></svg></span>'+
      '<span>Add to sticker pack</span>'+
    '</button>'+
    '<button id="_stkEditBtn" class="_mvOptBtn" style="color:#e9edef;border-bottom:1px solid rgba(255,255,255,.05)">'+
      '<span style="width:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e9edef" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>'+
      '<span>Edit sticker</span>'+
    '</button>'+
    '<button id="_stkOwnBtn" class="_mvOptBtn" style="color:#e9edef">'+
      '<span style="width:32px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/><circle cx="12" cy="12" r="3" stroke="none" fill="#a855f7"/></svg></span>'+
      '<span style="color:#a855f7;font-weight:600">Create with Gemini AI</span>'+
    '</button>'+
    (isMine ?
      '<button id="_stkDelBtn" class="_mvOptBtn" style="color:#f87171;border-top:1px solid rgba(255,255,255,.06)">'+
        '<span style="font-size:24px;width:30px;text-align:center">🗑️</span><span>Delete</span>'+
      '</button>' : '');

  ov.appendChild(sheet);
  document.body.appendChild(ov);

  document.getElementById('_stkFavBtn').onclick = function() {
    if (isFav) {
      _removeFav(src);
      ov.remove();
      if(typeof showToast==='function') showToast('Removed from favorites');
    } else {
      _addFav(src, label||'Sticker');
      ov.remove();
      if(typeof showToast==='function') showToast('⭐ Saved to favorites!');
    }
  };
  document.getElementById('_stkPackBtn').onclick = function(){
    // Show pack name overlay
    var packOv = document.createElement('div');
    packOv.style.cssText = 'position:fixed;inset:0;z-index:10010;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
    packOv.innerHTML =
      '<div style="background:#1a1f2e;border-radius:20px;padding:24px 20px;width:100%;max-width:340px">' +
        '<h3 style="color:#fff;font-size:16px;font-weight:700;margin:0 0 6px;text-align:center">Save to Sticker Pack</h3>' +
        '<p style="color:#6b7280;font-size:12px;margin:0 0 16px;text-align:center">Type a pack name or choose existing</p>' +
        '<input id="_packNameInp" placeholder="Pack name (e.g. My Vibes)" maxlength="30" style="width:100%;background:#0d1117;border:1.5px solid #374151;border-radius:12px;color:#fff;font-size:15px;padding:12px 14px;outline:none;box-sizing:border-box;caret-color:#8b5cf6;font-family:inherit">' +
        '<div id="_existingPacks" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px"></div>' +
        '<div style="display:flex;gap:10px;margin-top:18px">' +
          '<button id="_packCancel" style="flex:1;background:#1f2937;border:none;border-radius:12px;color:#9ca3af;font-size:14px;font-weight:600;padding:12px;cursor:pointer">Cancel</button>' +
          '<button id="_packSave" style="flex:2;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;padding:12px;cursor:pointer">Save to Pack</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(packOv);
    // Load existing pack names
    try {
      var existingPacks = JSON.parse(localStorage.getItem('_stkPacks') || '{}');
      var packNames = Object.keys(existingPacks);
      var epDiv = packOv.querySelector('#_existingPacks');
      packNames.forEach(function(pn) {
        var chip = document.createElement('button');
        chip.style.cssText = 'background:#2a3942;border:none;border-radius:20px;color:#e9edef;font-size:12px;padding:6px 12px;cursor:pointer';
        chip.textContent = pn;
        chip.onclick = function(){ packOv.querySelector('#_packNameInp').value = pn; };
        epDiv.appendChild(chip);
      });
    } catch(e) {}
    packOv.querySelector('#_packCancel').onclick = function(){ packOv.remove(); };
    packOv.querySelector('#_packSave').onclick = function() {
      var pName = (packOv.querySelector('#_packNameInp').value || '').trim();
      if (!pName) { packOv.querySelector('#_packNameInp').focus(); return; }
      _saveToUserPack(src, label || 'Sticker', pName);
      packOv.remove(); ov.remove();
      if(typeof showToast==='function') showToast('Saved to "'+pName+'" pack ✅');
    };
    setTimeout(function(){ packOv.querySelector('#_packNameInp').focus(); }, 100);
  };
  document.getElementById('_stkEditBtn').onclick = function(){
    ov.remove();
    _openStickerEditor(src, label);
  };
  document.getElementById('_stkOwnBtn').onclick = function(){ ov.remove(); _openGeminiStickerCreate(); };
  var del = document.getElementById('_stkDelBtn');
  if (del) del.onclick = function() {
    ov.remove();
    var cbs = G._vpCbs[msgId];
    if (cbs && cbs.onDelete) cbs.onDelete();
  };
};

/* ═══════════════════════════════════════════════════════════════════════
   FULLSCREEN VIDEO PLAYER
═══════════════════════════════════════════════════════════════════════ */
G.openVideoPlayer = function(msgId, url, senderName, ts, isMine) {
  _injectCSS();
  var ex = document.getElementById('_vpOv'); if (ex) { ex.querySelector('video')&&ex.querySelector('video').pause(); ex.remove(); }
  var cbs = G._vpCbs[msgId] || {};
  var _speed = 1, _speeds = [0.5,1,1.25,1.5,2], _reacting = false;

  var ov = document.createElement('div');
  ov.id = '_vpOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9980;background:#000;display:flex;flex-direction:column;font-family:-apple-system,sans-serif';

  ov.innerHTML =
    // ── Top bar ──
    '<div id="_vpTop" style="position:absolute;top:0;left:0;right:0;z-index:10;display:flex;align-items:center;gap:8px;padding:14px 14px 20px;background:linear-gradient(to bottom,rgba(0,0,0,.75),transparent);transition:opacity .3s">'+
      '<button id="_vpBack" style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.15);border:none;cursor:pointer;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0">←</button>'+
      '<div style="flex:1;min-width:0;padding:0 6px">'+
        '<p style="color:#fff;font-weight:700;font-size:15px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(isMine?'You':_esc(senderName||''))+'</p>'+
        '<p id="_vpAgo" style="color:rgba(255,255,255,.6);font-size:12px;margin:0">'+(ts?_ago(ts):'')+'</p>'+
      '</div>'+
      '<button id="_vpBkmk" style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'+
      '</button>'+
      '<button id="_vpShare" style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>'+
      '</button>'+
      '<button id="_vpMenu" style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>'+
      '</button>'+
    '</div>'+
    // ── Video area ──
    '<div id="_vpArea" style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">'+
      '<video id="_vpVid" src="'+_esc(url)+'" playsinline webkit-playsinline style="max-width:100%;max-height:100%;display:block"></video>'+
      '<div id="_vpBigPlay" style="position:absolute;width:64px;height:64px;border-radius:50%;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;pointer-events:none;transition:opacity .25s">'+
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>'+
      '</div>'+
    '</div>'+
    // ── React bar (hidden) — compact, scrollable, expandable ──
    '<div id="_vpReacts" style="display:none;position:absolute;bottom:130px;left:50%;transform:translateX(-50%);background:rgba(20,20,30,.96);border-radius:36px;padding:6px 8px;align-items:center;gap:2px;box-shadow:0 6px 28px rgba(0,0,0,.7);animation:_mvReact .2s ease;z-index:20;max-width:90vw;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">'+
      ['👍','❤️','😂','😮','😢','🙏','💀','🔥','😍','👏','😤','🥺','💯','🤣','😭','🤩','😱','🤔'].map(function(em){
        return '<button data-em="'+em+'" style="background:none;border:none;cursor:pointer;font-size:22px;padding:3px 5px;border-radius:10px;-webkit-tap-highlight-color:transparent;transition:transform .1s;flex-shrink:0" onmousedown="this.style.transform=\'scale(1.35)\'" onmouseup="this.style.transform=\'\'">'+em+'</button>';
      }).join('')+
    '</div>'+
    // ── Bottom controls ──
    '<div id="_vpBot" style="background:rgba(0,0,0,.88);padding:12px 16px 18px;flex-shrink:0;transition:opacity .3s">'+
      // Scrubber row
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'+
        '<span id="_vpCur" style="color:#fff;font-size:12px;font-weight:600;min-width:34px;flex-shrink:0">0:00</span>'+
        '<div id="_vpTrackWrap" style="flex:1;position:relative;height:28px;display:flex;align-items:center">'+
          '<div style="position:absolute;left:0;right:0;height:3px;border-radius:2px;background:rgba(255,255,255,.2)">'+
            '<div id="_vpProg" style="height:100%;width:0%;background:linear-gradient(90deg,#9333ea,#ec4899);border-radius:2px;pointer-events:none"></div>'+
          '</div>'+
          '<div id="_vpThumb" style="position:absolute;left:0%;width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);box-shadow:0 1px 8px rgba(147,51,234,.7);transform:translateX(-50%);pointer-events:none;transition:left .08s linear"></div>'+
          '<input id="_vpScrub" type="range" min="0" max="100" value="0" step="0.1" '+
            'style="position:absolute;left:0;right:0;width:100%;opacity:0;height:28px;margin:0;cursor:pointer;-webkit-appearance:none">'+
        '</div>'+
        '<span id="_vpDur" style="color:rgba(255,255,255,.55);font-size:12px;min-width:34px;text-align:right;flex-shrink:0">0:00</span>'+
        '<button id="_vpSpd" style="background:rgba(255,255,255,.15);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;padding:5px 10px;cursor:pointer;white-space:nowrap;flex-shrink:0">1.0x</button>'+
      '</div>'+
      // Playback row
      '<div style="display:flex;align-items:center;justify-content:space-between">'+
        '<button id="_vpReactToggle" style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.12);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">'+
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>'+
        '</button>'+
        '<button id="_vpPlay" style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(147,51,234,.55)">'+
          '<svg id="_vpPlayIc" width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>'+
          '<svg id="_vpPauseIc" width="26" height="26" viewBox="0 0 24 24" fill="white" style="display:none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'+
        '</button>'+
        '<button id="_vpReplyBtn" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:none;border-radius:24px;color:#fff;font-size:14px;font-weight:600;padding:10px 18px;cursor:pointer;-webkit-tap-highlight-color:transparent">'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>'+
          ' Reply'+
        '</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(ov);

  var vid = document.getElementById('_vpVid');
  var bigPlay = document.getElementById('_vpBigPlay');
  var playIc = document.getElementById('_vpPlayIc');
  var pauseIc = document.getElementById('_vpPauseIc');
  var scrub = document.getElementById('_vpScrub');
  var prog = document.getElementById('_vpProg');
  var thumb = document.getElementById('_vpThumb');
  var curEl = document.getElementById('_vpCur');
  var durEl = document.getElementById('_vpDur');
  var spdBtn = document.getElementById('_vpSpd');
  var reactsEl = document.getElementById('_vpReacts');
  var topBar = document.getElementById('_vpTop');
  var botBar = document.getElementById('_vpBot');
  var playBtn = document.getElementById('_vpPlay');

  // ── Auto-hide controls ─────────────────────────────────────────────────────
  var _t3 = null, _t10 = null, _ctrlsVisible = true;
  function _showCtrls() {
    _ctrlsVisible = true;
    topBar.style.opacity = '1'; topBar.style.pointerEvents = '';
    botBar.style.opacity = '1'; botBar.style.pointerEvents = '';
    playBtn.style.opacity = '1'; playBtn.style.pointerEvents = '';
    _resetTimers();
  }
  function _hidePlayBtn() {
    playBtn.style.opacity = '0'; playBtn.style.pointerEvents = 'none';
  }
  function _hideCtrls() {
    _ctrlsVisible = false;
    topBar.style.opacity = '0'; topBar.style.pointerEvents = 'none';
    botBar.style.opacity = '0'; botBar.style.pointerEvents = 'none';
    playBtn.style.opacity = '0'; playBtn.style.pointerEvents = 'none';
  }
  function _resetTimers() {
    clearTimeout(_t3); clearTimeout(_t10);
    _t3 = setTimeout(_hidePlayBtn, 3000);
    _t10 = setTimeout(_hideCtrls, 10000);
  }
  _resetTimers();
  document.getElementById('_vpArea').addEventListener('click', function() {
    if (!_ctrlsVisible) { _showCtrls(); return; }
    if (vid.paused) vid.play(); else vid.pause();
  });
  // Show controls on any touch
  ov.addEventListener('touchstart', function() { _showCtrls(); }, { passive: true });

  function _close() { vid.pause(); ov.remove(); }

  vid.play().catch(function(){});

  vid.addEventListener('loadedmetadata', function(){ durEl.textContent = _fmt(vid.duration); });
  vid.addEventListener('timeupdate', function(){
    if (!vid.duration) return;
    var p = (vid.currentTime/vid.duration)*100;
    prog.style.width = p+'%';
    if (thumb) thumb.style.left = p+'%';
    scrub.value = p; curEl.textContent = _fmt(vid.currentTime);
  });
  vid.addEventListener('play', function(){ playIc.style.display='none'; pauseIc.style.display=''; bigPlay.style.opacity='0'; });
  vid.addEventListener('pause', function(){ playIc.style.display=''; pauseIc.style.display='none'; bigPlay.style.opacity='1'; });
  vid.addEventListener('ended', function(){ playIc.style.display=''; pauseIc.style.display='none'; bigPlay.style.opacity='1'; });

  document.getElementById('_vpPlay').addEventListener('click', function(e){ e.stopPropagation(); if(vid.paused) vid.play(); else vid.pause(); });

  scrub.addEventListener('input', function(){ if(vid.duration) vid.currentTime=(scrub.value/100)*vid.duration; });

  spdBtn.addEventListener('click', function(){
    var idx=_speeds.indexOf(_speed); _speed=_speeds[(idx+1)%_speeds.length];
    vid.playbackRate=_speed; spdBtn.textContent=_speed+'x';
  });

  document.getElementById('_vpReactToggle').addEventListener('click', function(){
    _reacting=!_reacting;
    reactsEl.style.display=_reacting?'flex':'none';
  });
  // React buttons (scrollable bar)
  reactsEl.querySelectorAll('[data-em]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var em = btn.getAttribute('data-em');
      reactsEl.style.display='none'; _reacting=false;
      if(cbs.onReact) cbs.onReact(em);
    });
  });

  document.getElementById('_vpBack').addEventListener('click', _close);
  document.getElementById('_vpBkmk').addEventListener('click', function(){ if(typeof showToast==='function') showToast('Saved to bookmarks 🔖'); });
  document.getElementById('_vpShare').addEventListener('click', function(){
    if (cbs.onForward) {
      vid.pause(); ov.remove();
      cbs.onForward();
    } else if(navigator.share){ navigator.share({url:url,title:'Video from '+(senderName||'')}).catch(function(){}); }
    else { navigator.clipboard&&navigator.clipboard.writeText(url).then(function(){ if(typeof showToast==='function') showToast('Link copied!'); }); }
  });
  document.getElementById('_vpReplyBtn').addEventListener('click', function(){
    _close(); if(cbs.onReply) cbs.onReply();
  });
  document.getElementById('_vpMenu').addEventListener('click', function(){
    _showVidMenu(url, msgId, isMine, vid, ov, cbs);
  });
};

/* ── Video WhatsApp-style dropdown menu ──────────────────────────────────── */
function _showVidMenu(url, msgId, isMine, vid, playerOv, cbs) {
  _injectCSS();
  var ex = document.getElementById('_vidDrop'); if(ex){ ex.remove(); return; }

  var items = [
    { lb:'Share',
      ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
      fn:function(){ if(navigator.share){navigator.share({url:url}).catch(function(){});}else{navigator.clipboard&&navigator.clipboard.writeText(url).then(function(){if(typeof showToast==='function')showToast('Link copied!');});} }
    },
    { lb:'Star',
      ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      fn:function(){ if(typeof showToast==='function') showToast('⭐ Starred!'); }
    },
    { lb:'Show in chat',
      ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      fn:function(){
        // Try Picture-in-Picture so video keeps playing while returning to chat
        if (document.pictureInPictureEnabled && vid.requestPictureInPicture) {
          vid.requestPictureInPicture().then(function(){
            playerOv.remove();
          }).catch(function(){
            // PiP not allowed — just remove overlay without pausing
            playerOv.remove();
          });
        } else {
          playerOv.remove(); // keep audio going — don't call vid.pause()
        }
        var el = document.getElementById('msg_'+msgId)||document.getElementById('m_'+msgId)||document.getElementById('pm_'+msgId);
        if(el&&typeof G._highlightMsg==='function') G._highlightMsg(el);
      }
    },
    { lb:'Save',
      ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      fn:function(){ _dlFile(url,'video_'+Date.now()+'.mp4'); }
    },
    { lb:'Create sticker',
      ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      fn:function(){ _openTrimSticker(url, vid, playerOv); }
    },
    { lb:'Ask Gemini ✨',
      ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
      fn:function(){ vid.pause(); playerOv.remove(); setTimeout(function(){ _openGeminiVideoAnalysis(url, vid); }, 80); }
    }
  ];
  if(isMine) items.push({
    lb:'Delete', danger:true,
    ic:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    fn:function(){ vid.pause(); playerOv.remove(); if(cbs.onDelete) cbs.onDelete(); }
  });

  var drop = document.createElement('div');
  drop.id = '_vidDrop';
  // Position: top-right, below the ⋮ button
  drop.style.cssText =
    'position:fixed;top:60px;right:10px;z-index:9990;'+
    'background:#1e2533;border-radius:6px;'+
    'box-shadow:0 4px 20px rgba(0,0,0,.8);'+
    'min-width:190px;overflow:hidden;'+
    'animation:_mvIn .15s ease;';

  items.forEach(function(item, i) {
    var btn = document.createElement('button');
    btn.style.cssText =
      'display:flex;align-items:center;gap:16px;width:100%;padding:13px 18px;background:none;border:none;cursor:pointer;'+
      'color:'+(item.danger?'#f87171':'#e9edef')+';font-size:14.5px;font-weight:400;text-align:left;'+
      '-webkit-tap-highlight-color:transparent;'+
      (i < items.length-1 ? 'border-bottom:1px solid rgba(255,255,255,.06)' : '');
    btn.innerHTML = '<span style="display:flex;align-items:center;opacity:.75;flex-shrink:0">'+item.ic+'</span><span>'+item.lb+'</span>';
    btn.addEventListener('touchstart', function(){ btn.style.background='rgba(255,255,255,.07)'; }, { passive:true });
    btn.addEventListener('touchend',   function(){ btn.style.background='none'; }, { passive:true });
    btn.addEventListener('click', function(e){ e.stopPropagation(); drop.remove(); item.fn(); });
    drop.appendChild(btn);
  });

  // Tap anywhere else → close
  function _closeOnOut(e) {
    if (!drop.contains(e.target)) { drop.remove(); document.removeEventListener('touchend', _closeOnOut); document.removeEventListener('click', _closeOnOut); }
  }
  setTimeout(function(){
    document.addEventListener('touchend', _closeOnOut, { passive:true });
    document.addEventListener('click', _closeOnOut);
  }, 50);

  document.body.appendChild(drop);
}

/* ── Gemini Video Analysis ─────────────────────────────────────────────── */
function _openGeminiVideoAnalysis(url, vid, playerOv, senderName, ts) {
  _injectCSS();
  var ex = document.getElementById('_gemVidOv'); if (ex) { ex.remove(); return; }

  var ov = document.createElement('div');
  ov.id = '_gemVidOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.85);display:flex;flex-direction:column;font-family:-apple-system,sans-serif;padding-bottom:env(safe-area-inset-bottom)';

  // Show the overlay immediately so user sees something
  ov.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.1)">'+
      '<button id="_gvBack" style="background:rgba(255,255,255,.1);border:none;border-radius:50%;width:38px;height:38px;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center">←</button>'+
      '<div style="flex:1"><div style="color:#a855f7;font-size:11px;font-weight:700;letter-spacing:.5px">GEMINI AI</div><div style="color:#fff;font-weight:700;font-size:15px">Analyse Video</div></div>'+
    '</div>'+
    '<div id="_gvMsgs" style="flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:12px">'+
      '<div id="_gvFrameStatus" style="background:rgba(147,51,234,.15);border:1px solid rgba(147,51,234,.3);border-radius:14px;padding:12px 14px;font-size:13px;color:#d1d5db">⏳ Preparing video analysis…</div>'+
    '</div>'+
    '<div style="padding:10px 12px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px">'+
      '<input id="_gvInp" placeholder="Ask about this video…" style="flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:24px;padding:10px 16px;color:#fff;font-size:14px;outline:none;caret-color:#a855f7">'+
      '<button id="_gvSend" style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="22 2 11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>'+
      '</button>'+
    '</div>';
  document.body.appendChild(ov);
  document.getElementById('_gvBack').addEventListener('click', function(){ ov.remove(); });

  // Capture a frame from the video for Gemini to analyse — run as async IIFE
  (async function() {
  // crossOrigin must be set before src loads — try fetching the frame via blob URL to bypass CORS
  var frameB64 = null;
  try {
    // First try direct canvas capture (works if video already loaded crossOrigin)
    var canvas = document.createElement('canvas');
    canvas.width = Math.min(vid.videoWidth || 320, 640);
    canvas.height = Math.min(vid.videoHeight || 240, 480);
    var ctx2d = canvas.getContext('2d');
    ctx2d.drawImage(vid, 0, 0, canvas.width, canvas.height);
    var td = canvas.toDataURL('image/jpeg', 0.75);
    // Check it's not a blank/tainted canvas (tainted = data URI has no pixels)
    if (td && td.length > 500) frameB64 = td.split(',')[1];
  } catch(e) { frameB64 = null; }

  // If canvas was tainted (CORS), fetch the video URL as blob and draw from that
  if (!frameB64 && url) {
    try {
      var blobResp = await fetch(url, { mode: 'cors' });
      var blobData = await blobResp.blob();
      var blobObjUrl = URL.createObjectURL(blobData);
      var tmpVid = document.createElement('video');
      tmpVid.src = blobObjUrl; tmpVid.crossOrigin = 'anonymous'; tmpVid.muted = true;
      await new Promise(function(res){ tmpVid.addEventListener('loadeddata', res); tmpVid.load(); });
      tmpVid.currentTime = 0.5;
      await new Promise(function(res){ tmpVid.addEventListener('seeked', res, {once:true}); setTimeout(res, 1500); });
      var c2 = document.createElement('canvas');
      c2.width = Math.min(tmpVid.videoWidth || 320, 640);
      c2.height = Math.min(tmpVid.videoHeight || 240, 480);
      c2.getContext('2d').drawImage(tmpVid, 0, 0, c2.width, c2.height);
      var td2 = c2.toDataURL('image/jpeg', 0.75);
      if (td2 && td2.length > 500) frameB64 = td2.split(',')[1];
      URL.revokeObjectURL(blobObjUrl);
    } catch(e2) { frameB64 = null; }
  }

  // Update the status message now that frame capture is done
  var statusEl = document.getElementById('_gvFrameStatus');
  if (statusEl) statusEl.textContent = '🎬 I can see this video. Ask me anything — what it shows, key moments, objects, actions, or context!';

  var msgs = document.getElementById('_gvMsgs');
  var inp = document.getElementById('_gvInp');
  var _gvHistory = [];
  var GEMINI_KEY = 'AIzaSyB9Ap4XhekePy7M3lBW6YaBmArYluK_DGc';

  function _addBubble(text, isUser) {
    var d = document.createElement('div');
    d.style.cssText = isUser
      ? 'align-self:flex-end;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;border-radius:18px 18px 4px 18px;padding:10px 14px;max-width:80%;font-size:14px;line-height:1.5'
      : 'align-self:flex-start;background:rgba(255,255,255,.08);color:#e9edef;border-radius:18px 18px 18px 4px;padding:10px 14px;max-width:90%;font-size:14px;line-height:1.6;white-space:pre-wrap';
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function _addTyping() {
    var d = document.createElement('div');
    d.id = '_gvTyping';
    d.style.cssText = 'align-self:flex-start;background:rgba(255,255,255,.08);border-radius:18px;padding:10px 14px;display:flex;gap:5px;align-items:center';
    d.innerHTML = [1,2,3].map(function(){ return '<div style="width:7px;height:7px;border-radius:50%;background:#a855f7;animation:waDotBounce 1.2s ease infinite"></div>'; }).join('');
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  }

  async function _ask(question) {
    var btn = document.getElementById('_gvSend'); if (btn) btn.disabled = true;
    _addBubble(question, true);
    inp.value = '';
    _gvHistory.push({ role: 'user', parts: [{ text: question }] });
    _addTyping();

    try {
      var reqParts = [];
      // First message: include video frame for context
      if (_gvHistory.length === 1 && frameB64) {
        reqParts.push({ inlineData: { mimeType: 'image/jpeg', data: frameB64 } });
        reqParts.push({ text: 'This is a frame from a video sent in a chat app. ' + question });
      } else {
        reqParts.push({ text: question });
      }
      var body = {
        contents: _gvHistory.slice(0,-1).concat([{ role:'user', parts: reqParts }]),
        systemInstruction: { parts: [{ text: 'You are a smart video analysis assistant. Analyse the provided video frame and answer questions about what the video shows, its content, context, objects, people, actions, text visible, and anything relevant. Be concise and insightful.' }] },
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      };
      var resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' + GEMINI_KEY, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      var data = await resp.json();
      var reply = (data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts&&data.candidates[0].content.parts[0]&&data.candidates[0].content.parts[0].text) || 'Sorry, I couldn\'t analyse that. Try again!';
      var t = document.getElementById('_gvTyping'); if (t) t.remove();
      _addBubble(reply, false);
      _gvHistory.push({ role: 'model', parts: [{ text: reply }] });
    } catch(e) {
      var t2 = document.getElementById('_gvTyping'); if (t2) t2.remove();
      _addBubble('Connection error. Check your internet and try again.', false);
    }
    if (btn) btn.disabled = false;
    inp.focus();
  }

  document.getElementById('_gvSend').addEventListener('click', function(){ var q=inp.value.trim(); if(q) _ask(q); });
  inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var q=inp.value.trim(); if(q) _ask(q); } });

  // Auto-ask initial analysis
  setTimeout(function(){ _ask('What is happening in this video? Describe what you can see.'); }, 400);
  })(); // end async IIFE
}

/* ── Trim → Create Sticker from video ─────────────────────────────────── */
function _openTrimSticker(url, existingVid, playerOv) {
  _injectCSS();
  var ov = document.createElement('div');
  ov.id = '_trimStk';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9990;background:#000;display:flex;flex-direction:column;font-family:-apple-system,sans-serif';

  ov.innerHTML =
    '<div style="padding:18px;text-align:center;flex-shrink:0">'+
      '<h2 style="color:#fff;font-weight:700;font-size:18px;margin:0">Trim</h2>'+
    '</div>'+
    '<div id="_tsVWrap" style="flex:1;display:flex;align-items:center;justify-content:center;background:#0a0a0a;position:relative;overflow:hidden">'+
      '<video id="_tsVid" src="'+_esc(url)+'" muted playsinline webkit-playsinline style="max-width:100%;max-height:100%;display:block;border-radius:6px" preload="auto"></video>'+
      '<div id="_tsPause" style="position:absolute;width:60px;height:60px;border-radius:50%;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity .25s">'+
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>'+
      '</div>'+
    '</div>'+
    '<div style="background:#111;padding:14px 16px 6px;flex-shrink:0">'+
      // Filmstrip
      '<div id="_tsFilm" style="position:relative;border-radius:12px;overflow:hidden;height:60px;background:#1f2937;margin-bottom:14px;display:flex;align-items:stretch">'+
        '<div id="_tsL" style="width:5px;background:linear-gradient(135deg,#9333ea,#ec4899);flex-shrink:0;cursor:ew-resize"></div>'+
        '<div id="_tsFrames" style="flex:1;display:flex;overflow:hidden;gap:1px"></div>'+
        '<div id="_tsR" style="width:5px;background:linear-gradient(135deg,#9333ea,#ec4899);flex-shrink:0;cursor:ew-resize"></div>'+
      '</div>'+
      '<div style="display:flex;gap:10px">'+
        '<button id="_tsCancel" style="flex:1;padding:14px;background:#1f2937;border:none;border-radius:16px;color:#9ca3af;font-size:15px;font-weight:600;cursor:pointer">Cancel</button>'+
        '<button id="_tsDone" style="flex:1;padding:14px;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:16px;color:#fff;font-size:15px;font-weight:700;cursor:pointer">Done</button>'+
      '</div>'+
    '</div>';

  document.body.appendChild(ov);

  var tsVid = document.getElementById('_tsVid');
  var tsPause = document.getElementById('_tsPause');
  var tsFrames = document.getElementById('_tsFrames');

  tsVid.play().catch(function(){});
  tsVid.addEventListener('play',  function(){ tsPause.style.opacity='0'; });
  tsVid.addEventListener('pause', function(){ tsPause.style.opacity='1'; });

  document.getElementById('_tsVWrap').addEventListener('click', function(){
    if(tsVid.paused) tsVid.play(); else tsVid.pause();
  });

  // Build filmstrip
  function _buildFilmstrip() {
    var count=8, dur=tsVid.duration||7, idx=0;
    var canvas=document.createElement('canvas'); canvas.width=60;canvas.height=60;
    var ctx=canvas.getContext('2d');
    function next(){
      if(idx>=count) return;
      tsVid.currentTime=(idx/(count-1))*dur;
      tsVid.addEventListener('seeked',function onS(){
        tsVid.removeEventListener('seeked',onS);
        try{ctx.drawImage(tsVid,0,0,60,60);}catch(e){}
        var img=document.createElement('img');
        img.src=canvas.toDataURL('image/jpeg',.65);
        img.style.cssText='height:60px;object-fit:cover;flex:1';
        tsFrames.appendChild(img);
        idx++; next();
      });
    }
    next();
  }
  if(tsVid.readyState>=2) _buildFilmstrip();
  else tsVid.addEventListener('loadeddata', _buildFilmstrip);

  document.getElementById('_tsCancel').addEventListener('click', function(){
    tsVid.pause(); ov.remove();
  });

  document.getElementById('_tsDone').addEventListener('click', function(){
    tsVid.pause();
    // Capture frame at current time
    var canvas=document.createElement('canvas');
    var vw=tsVid.videoWidth||512, vh=tsVid.videoHeight||512;
    var size=Math.min(vw,vh,512);
    canvas.width=size; canvas.height=size;
    var ctx=canvas.getContext('2d');
    var sx=(vw-size)/2, sy=(vh-size)/2;
    try{ ctx.drawImage(tsVid,sx,sy,size,size,0,0,size,size); }catch(e){}

    // Show "Preparing sticker" overlay
    var prep=document.createElement('div');
    prep.style.cssText='position:absolute;inset:0;z-index:5;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center';
    prep.innerHTML=
      '<div style="background:#1f2937;border-radius:20px;padding:24px 32px;min-width:200px">'+
        '<p style="color:#fff;font-size:16px;font-weight:600;margin:0 0 14px">Preparing sticker</p>'+
        '<div style="height:4px;background:#374151;border-radius:2px;overflow:hidden">'+
          '<div id="_prepProg" style="height:100%;width:0%;background:linear-gradient(90deg,#9333ea,#ec4899);transition:width .9s ease"></div>'+
        '</div>'+
      '</div>';
    ov.style.position='relative'; ov.appendChild(prep);
    setTimeout(function(){ var b=document.getElementById('_prepProg'); if(b) b.style.width='80%'; },80);

    canvas.toBlob(function(blob){
      if(!blob){ prep.remove(); if(typeof showToast==='function') showToast('Failed','error'); return; }
      var file=new File([blob],'sticker_'+Date.now()+'.png',{type:'image/png'});
      function _finish(stickerUrl){
        var pb=document.getElementById('_prepProg'); if(pb) pb.style.width='100%';
        setTimeout(function(){
          ov.remove();
          if(playerOv) playerOv.remove();
          _addFav(stickerUrl,'My Sticker');
          G.openStickerSheet(stickerUrl,'My Sticker','Physio SUAI Stickers',null,true);
          if(typeof showToast==='function') showToast('🎭 Sticker created!');
        },500);
      }
      if(typeof uploadFile==='function'){
        uploadFile(file,'stickers').then(function(res){ _finish(res.success?res.url:URL.createObjectURL(blob)); }).catch(function(){ _finish(URL.createObjectURL(blob)); });
      } else { _finish(URL.createObjectURL(blob)); }
    },'image/png',.92);
  });
}

/* ── Create Sticker from Image ────────────────────────────────────────── */
G.openCreateStickerFromImage = function(src, msgId) {
  _injectCSS();
  var isVideo = src && (src.match(/\.(mp4|webm|mov|avi)/i) || src.includes('video'));
  var ov = document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;z-index:9990;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,sans-serif';

  // Canvas for both image and video frame
  var _canvas = document.createElement('canvas');
  var _ctx = _canvas.getContext('2d');
  var _frameReady = false;

  ov.innerHTML=
    '<div style="position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:14px 16px">'+
      '<button id="_isBk" style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center">←</button>'+
      '<span style="color:#fff;font-size:15px;font-weight:700">Create Sticker</span>'+
      '<div style="width:42px"></div>'+
    '</div>'+
    '<div id="_isPreview" style="display:flex;align-items:center;justify-content:center;width:80vw;height:60vw;max-width:320px;max-height:320px;position:relative">'+
      '<div style="width:48px;height:48px;border:3px solid #374151;border-top-color:#ec4899;border-radius:50%;animation:_mvSpin .8s linear infinite" id="_isLoader"></div>'+
    '</div>'+
    '<div style="position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;padding:16px 20px 28px;background:linear-gradient(to top,rgba(0,0,0,.7),transparent)">'+
      '<p style="color:#8696a0;font-size:13px;margin:0">Physio SUAI Stickers</p>'+
      '<button id="_isOk" style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(147,51,234,.5)">'+
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><polyline points="20 6 9 17 4 12"/></svg>'+
      '</button>'+
    '</div>';

  document.body.appendChild(ov);

  var prevEl = document.getElementById('_isPreview');

  function _showFrameOnCanvas(imgEl) {
    var size = Math.min(prevEl.offsetWidth || 280, prevEl.offsetHeight || 280, 512);
    _canvas.width = size; _canvas.height = size;
    var scale = Math.min(size / imgEl.naturalWidth, size / imgEl.naturalHeight);
    var w = imgEl.naturalWidth * scale, h = imgEl.naturalHeight * scale;
    _ctx.clearRect(0,0,size,size);
    _ctx.drawImage(imgEl, (size-w)/2, (size-h)/2, w, h);
    _frameReady = true;
    document.getElementById('_isLoader') && (document.getElementById('_isLoader').style.display='none');
    _canvas.style.cssText = 'max-width:100%;max-height:100%;border-radius:20px;object-fit:contain';
    prevEl.appendChild(_canvas);
  }

  if (isVideo) {
    // Capture first frame from video
    var _v = document.createElement('video');
    _v.crossOrigin = 'anonymous'; _v.muted = true; _v.playsInline = true;
    _v.src = src;
    _v.onloadedmetadata = function() { _v.currentTime = 0.5; };
    _v.onseeked = function() {
      var size = Math.min(320, 512);
      _canvas.width = size; _canvas.height = size;
      var scale = Math.min(size / _v.videoWidth, size / _v.videoHeight);
      var w = _v.videoWidth * scale, h = _v.videoHeight * scale;
      _ctx.clearRect(0,0,size,size);
      _ctx.drawImage(_v, (size-w)/2, (size-h)/2, w, h);
      _frameReady = true;
      document.getElementById('_isLoader') && (document.getElementById('_isLoader').style.display='none');
      _canvas.style.cssText = 'max-width:100%;max-height:100%;border-radius:20px;object-fit:contain';
      prevEl.appendChild(_canvas);
    };
    _v.onerror = function() {
      // Fallback: show a video thumbnail placeholder
      document.getElementById('_isLoader') && (document.getElementById('_isLoader').style.display='none');
      var fb = document.createElement('div');
      fb.style.cssText='width:160px;height:160px;border-radius:20px;background:#1a1f2e;display:flex;align-items:center;justify-content:center;font-size:60px';
      fb.textContent='🎬'; prevEl.appendChild(fb);
      _frameReady = false;
    };
    document.body.appendChild(_v); // must be in DOM
    setTimeout(function(){ _v.load(); }, 50);
  } else {
    // Image
    var _img = document.createElement('img');
    _img.crossOrigin = 'anonymous'; _img.src = src;
    _img.onload = function() { _showFrameOnCanvas(_img); };
    _img.onerror = function() {
      document.getElementById('_isLoader') && (document.getElementById('_isLoader').style.display='none');
      prevEl.innerHTML = '<img src="'+_esc(src)+'" style="max-width:100%;max-height:100%;border-radius:20px;object-fit:contain" onerror="this.style.opacity=.3">';
      _frameReady = false; // will use src directly
    };
  }

  document.getElementById('_isBk').onclick = function() { ov.remove(); };

  document.getElementById('_isOk').onclick = function() {
    var _finalize = function(url) {
      _addFav(url, 'My Sticker');
      _saveToUserPack(url, 'My Sticker', 'My Stickers');
      ov.remove();
      G.openStickerSheet(url, 'My Sticker', 'Physio SUAI Stickers', null, true);
      if (typeof showToast === 'function') showToast('🎭 Sticker created!');
    };

    var _uploadAndFinalize = function(dataUrl) {
      if (!dataUrl) { _finalize(src); return; }
      try {
        var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1];
        var bstr = atob(arr[1]), n = bstr.length, u8 = new Uint8Array(n);
        while(n--) u8[n] = bstr.charCodeAt(n);
        var file = new File([u8], 'sticker_'+Date.now()+'.png', {type:'image/png'});
        if (typeof uploadFile === 'function') {
          uploadFile(file, 'stickers').then(function(res) {
            _finalize(res && res.success ? res.url : dataUrl);
          }).catch(function() { _finalize(dataUrl); });
        } else {
          _finalize(dataUrl);
        }
      } catch(e) { _finalize(dataUrl || src); }
    };

    if (_frameReady && _canvas.width > 0) {
      try { _uploadAndFinalize(_canvas.toDataURL('image/png')); }
      catch(e) { _finalize(src); }
    } else {
      _finalize(src);
    }
  };
};

/* ── Highlight replied-to message — WhatsApp style background pulse ──── */
G._highlightMsg = function(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Remove any lingering animation
  el.style.transition = 'none';
  el.style.background = 'linear-gradient(135deg,rgba(147,51,234,.30),rgba(236,72,153,.18))';
  el.style.borderRadius = '14px';
  // Force reflow
  void el.offsetWidth;
  // Fade out over 800ms — same feel as WhatsApp teal flash
  el.style.transition = 'background 0.8s ease';
  setTimeout(function() {
    el.style.background = '';
    el.style.borderRadius = '';
    setTimeout(function() { el.style.transition = ''; }, 900);
  }, 650);
};

/* ── Download helper ─────────────────────────────────────────────────── */
function _dlFile(url, name) {
  if(typeof showToast==='function') showToast('Downloading…');
  fetch(url).then(function(r){return r.blob();}).then(function(b){
    var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name||'file';
    document.body.appendChild(a); a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(a.href);},1000);
    if(typeof showToast==='function') showToast('Saved ✓');
  }).catch(function(){ window.open(url,'_blank'); });
}

/* ── Public aliases ──────────────────────────────────────────────────── */
G.openStickerSheet = G.openStickerSheet;
G.openVideoPlayer  = G.openVideoPlayer;
G._addFav          = _addFav;   // expose so external sticker editor can save to favourites

})(window);

/* ═══════════════════════════════════════════════════════════════════════
   STICKER EDITOR — Crop + Add Text → Save to Favorites or Pack
═══════════════════════════════════════════════════════════════════════ */
function _openStickerEditor(src, origLabel) {
  var ex = document.getElementById('_stkEditorOv'); if (ex) ex.remove();
  var ov = document.createElement('div');
  ov.id = '_stkEditorOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#0d1117;display:flex;flex-direction:column;font-family:-apple-system,sans-serif';

  ov.innerHTML =
    // Top bar
    '<div style="background:#111827;padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1f2937;flex-shrink:0">' +
      '<button id="_stkEdClose" style="width:36px;height:36px;background:#1f2937;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9edef" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<span style="color:#fff;font-weight:700;font-size:16px;flex:1">Edit Sticker</span>' +
      '<button id="_stkEdDone" style="background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:14px;padding:8px 16px;cursor:pointer">Done ✓</button>' +
    '</div>' +
    // Canvas area
    '<div style="flex:1;display:flex;align-items:center;justify-content:center;padding:16px;position:relative;overflow:hidden">' +
      '<canvas id="_stkEdCanvas" style="max-width:100%;max-height:100%;border-radius:16px;touch-action:none"></canvas>' +
    '</div>' +
    // Text input
    '<div style="background:#111827;border-top:1px solid #1f2937;padding:12px 16px;flex-shrink:0">' +
      '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">' +
        '<input id="_stkEdText" placeholder="Add text to sticker…" maxlength="40" style="flex:1;background:#1a1f2e;border:1.5px solid #374151;border-radius:12px;color:#fff;font-size:14px;padding:10px 14px;outline:none;caret-color:#8b5cf6;font-family:inherit">' +
        '<input type="color" id="_stkEdColor" value="#ffffff" style="width:38px;height:38px;border:none;background:none;cursor:pointer;border-radius:8px;flex-shrink:0" title="Text color">' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button id="_stkEdFav" style="flex:1;background:#1f2937;border:none;border-radius:12px;color:#fbbf24;font-size:13px;font-weight:600;padding:11px 8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Save to Favorites' +
        '</button>' +
        '<button id="_stkEdPack" style="flex:1;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:700;padding:11px 8px;cursor:pointer">' +
          'Save to Pack' +
        '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(ov);

  var canvas = document.getElementById('_stkEdCanvas');
  var ctx = canvas.getContext('2d');
  var img = new Image(); img.crossOrigin = 'anonymous'; img.src = src;
  img.onload = function() {
    var size = Math.min(window.innerWidth - 32, window.innerHeight - 200, 340);
    canvas.width = size; canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    // Draw image centered with contain fit
    var scale = Math.min(size / img.width, size / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  };

  function _redraw() {
    if (!img.complete || !img.naturalWidth) return;
    var size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    var scale = Math.min(size / img.width, size / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
    var txt = document.getElementById('_stkEdText').value;
    if (txt) {
      var col = document.getElementById('_stkEdColor').value || '#ffffff';
      ctx.font = 'bold ' + Math.floor(size / 10) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.strokeText(txt, size / 2, size - 20);
      ctx.fillStyle = col;
      ctx.fillText(txt, size / 2, size - 20);
    }
  }

  document.getElementById('_stkEdText').addEventListener('input', _redraw);
  document.getElementById('_stkEdColor').addEventListener('input', _redraw);
  document.getElementById('_stkEdClose').onclick = function() { ov.remove(); };

  // Safe toDataURL — falls back to original src if canvas is CORS-tainted
  function _getStickerData() {
    try {
      _redraw();
      return canvas.toDataURL('image/png');
    } catch(e) {
      // Canvas tainted (cross-origin image) — use original src
      return src;
    }
  }

  function _doSaveFav() {
    var dataUrl = _getStickerData();
    var lbl = origLabel || 'Edited Sticker';
    _addFav(dataUrl, lbl);
    ov.remove();
    if (typeof showToast === 'function') showToast('⭐ Saved to Favourites!');
  }

  document.getElementById('_stkEdDone').onclick = _doSaveFav;
  document.getElementById('_stkEdFav').onclick   = _doSaveFav;

  document.getElementById('_stkEdPack').onclick = function() {
    var dataUrl = _getStickerData();
    var lbl = origLabel || 'Edited Sticker';
    var packName = prompt('Pack name (leave blank for "My Stickers"):') || 'My Stickers';
    packName = packName.trim() || 'My Stickers';
    _saveToUserPack(dataUrl, lbl, packName);
    ov.remove();
    if (typeof showToast === 'function') showToast('📦 Saved to "' + packName + '" pack!');
  };
}

/* Save sticker URL to a named user pack in _stkPacks */
function _saveToUserPack(src, label, packName) {
  if (!src || !packName) return;
  try {
    var packs = JSON.parse(localStorage.getItem('_stkPacks') || '{}');
    if (!packs[packName]) packs[packName] = [];
    // Store as {src, label} object
    var existing = packs[packName];
    if (!existing.some(function(e){ return (e.src||e) === src; })) {
      existing.unshift({ src: src, label: label || 'Sticker' });
      packs[packName] = existing.slice(0, 50);
    }
    localStorage.setItem('_stkPacks', JSON.stringify(packs));
  } catch(e) {}
}
G._saveToUserPack = _saveToUserPack;

/* ═══════════════════════════════════════════════════════════════════════
   CREATE STICKER WITH GEMINI — gemini-3.1-flash-image-preview
═══════════════════════════════════════════════════════════════════════ */
function _openGeminiStickerCreate() {
  var ex = document.getElementById('_gemStkOv'); if (ex) ex.remove();
  var GKEY = 'AIzaSyB9Ap4XhekePy7M3lBW6YaBmArYluK_DGc';
  var MODEL = 'gemini-3.1-flash-image-preview';
  var _genUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + GKEY;

  var ov = document.createElement('div');
  ov.id = '_gemStkOv';
  ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#0d1117;display:flex;flex-direction:column;font-family:-apple-system,sans-serif';

  ov.innerHTML =
    '<div style="background:#111827;padding:12px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #1f2937;flex-shrink:0">' +
      '<button id="_gemStkClose" style="width:36px;height:36px;background:#1f2937;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9edef" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<div style="flex:1">' +
        '<div style="color:#fff;font-weight:700;font-size:16px">Create Sticker</div>' +
        '<div style="color:#a855f7;font-size:11px;font-weight:600">Powered by Gemini AI ✨</div>' +
      '</div>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:16px">' +
      // Prompt area
      '<div>' +
        '<label style="color:#9ca3af;font-size:12px;font-weight:600;letter-spacing:.5px;display:block;margin-bottom:6px">DESCRIBE YOUR STICKER</label>' +
        '<textarea id="_gemStkPrompt" placeholder="e.g. A cute cartoon physiotherapy student holding a skeleton, sticker style, white background, vibrant colors…" rows="3" style="width:100%;background:#1a1f2e;border:1.5px solid #374151;border-radius:14px;color:#fff;font-size:14px;padding:12px 14px;outline:none;resize:none;box-sizing:border-box;caret-color:#a855f7;font-family:inherit;line-height:1.5"></textarea>' +
      '</div>' +
      // Style chips
      '<div>' +
        '<label style="color:#9ca3af;font-size:12px;font-weight:600;letter-spacing:.5px;display:block;margin-bottom:8px">STYLE</label>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px" id="_gemStkStyles">' +
          ['Cartoon','Anime','Pixel Art','3D','Minimalist','Cute Chibi','Watercolor','Sticker Art'].map(function(s){
            return '<button class="_gss" data-style="'+s+'" style="background:#1a1f2e;border:1.5px solid #374151;border-radius:20px;color:#9ca3af;font-size:13px;padding:7px 14px;cursor:pointer;-webkit-tap-highlight-color:transparent">'+s+'</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      // Preview area
      '<div id="_gemStkPreview" style="display:none;flex-direction:column;align-items:center;gap:14px">' +
        '<img id="_gemStkImg" style="width:200px;height:200px;border-radius:20px;object-fit:contain;background:#1a1f2e;border:1.5px solid #374151">' +
        '<div style="display:flex;gap:10px;width:100%">' +
          '<button id="_gemStkRegen" style="flex:1;background:#1f2937;border:none;border-radius:12px;color:#e9edef;font-size:13px;font-weight:600;padding:12px;cursor:pointer">↻ Regenerate</button>' +
          '<button id="_gemStkSave" style="flex:2;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:700;padding:12px;cursor:pointer">⭐ Save Sticker</button>' +
        '</div>' +
      '</div>' +
      // Loading
      '<div id="_gemStkLoading" style="display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:30px 0">' +
        '<div style="width:48px;height:48px;border-radius:50%;border:3px solid #374151;border-top-color:#a855f7;animation:_mvSpin 0.8s linear infinite"></div>' +
        '<div style="color:#9ca3af;font-size:13px">Generating sticker…</div>' +
      '</div>' +
    '</div>' +
    // Generate button
    '<div style="background:#111827;border-top:1px solid #1f2937;padding:12px 16px;flex-shrink:0">' +
      '<button id="_gemStkGen" style="width:100%;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;padding:15px;cursor:pointer">' +
        '✨ Generate Sticker' +
      '</button>' +
    '</div>';

  document.body.appendChild(ov);

  var _selStyle = 'Cartoon';
  // Style chip selection
  ov.querySelectorAll('._gss').forEach(function(btn) {
    if (btn.getAttribute('data-style') === _selStyle) {
      btn.style.background = 'linear-gradient(135deg,#9333ea,#ec4899)';
      btn.style.borderColor = '#9333ea'; btn.style.color = '#fff';
    }
    btn.onclick = function() {
      ov.querySelectorAll('._gss').forEach(function(b){
        b.style.background = '#1a1f2e'; b.style.borderColor = '#374151'; b.style.color = '#9ca3af';
      });
      btn.style.background = 'linear-gradient(135deg,#9333ea,#ec4899)';
      btn.style.borderColor = '#9333ea'; btn.style.color = '#fff';
      _selStyle = btn.getAttribute('data-style');
    };
  });

  document.getElementById('_gemStkClose').onclick = function() { ov.remove(); };

  var _lastDataUrl = null;

  async function _generate() {
    var prompt = (document.getElementById('_gemStkPrompt').value || '').trim();
    if (!prompt) { document.getElementById('_gemStkPrompt').focus(); return; }
    document.getElementById('_gemStkLoading').style.display = 'flex';
    document.getElementById('_gemStkPreview').style.display = 'none';
    document.getElementById('_gemStkGen').disabled = true;
    var fullPrompt = _selStyle + ' style sticker: ' + prompt + '. White or transparent background. Sticker design. High quality, vibrant.';
    try {
      var res = await fetch(_genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        })
      });
      var data = await res.json();
      var parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      var imgPart = parts.find(function(p){ return p.inlineData && p.inlineData.data; });
      if (imgPart) {
        var mime = imgPart.inlineData.mimeType || 'image/png';
        _lastDataUrl = 'data:' + mime + ';base64,' + imgPart.inlineData.data;
        document.getElementById('_gemStkImg').src = _lastDataUrl;
        document.getElementById('_gemStkPreview').style.display = 'flex';
        if (typeof showToast === 'function') showToast('Sticker ready! ✨');
      } else {
        if (typeof showToast === 'function') showToast('No image in response. Try a different prompt.', 'error');
      }
    } catch(e) {
      if (typeof showToast === 'function') showToast('Generation failed: ' + (e.message||'error'), 'error');
    }
    document.getElementById('_gemStkLoading').style.display = 'none';
    document.getElementById('_gemStkGen').disabled = false;
  }

  document.getElementById('_gemStkGen').onclick = _generate;
  document.getElementById('_gemStkRegen') && (document.getElementById('_gemStkRegen').onclick = _generate);
  document.getElementById('_gemStkSave').onclick = function() {
    if (!_lastDataUrl) return;
    // Open editor so user can add text before saving
    ov.remove();
    _openStickerEditor(_lastDataUrl, 'AI Sticker');
  };
}
