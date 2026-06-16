// ================================================================
//  Physio SUAI — Chat Theme System (WhatsApp-style)
//  Adds: Preset themes, Chat color picker, Wallpaper picker,
//        Live preview with brightness slider + swipe pagination
//  Usage: Call initChatTheme(roomKey) after auth resolves.
//         roomKey = chatId for private chats, 'funjokes' etc for rooms.
// ================================================================

function initChatTheme(roomKey) {
  if (document.getElementById('chatThemeContainer')) return; // already inited

  // ── WALLPAPER PRESETS (dark & moody — matching WhatsApp dark style) ─
  var WALLPAPERS = [
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80', // starry mountains night
    'https://images.unsplash.com/photo-1520034475321-cbe63696469a?w=900&q=80', // jellyfish dark ocean
    'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=900&q=80', // earth from space
    'https://images.unsplash.com/photo-1536329583941-14287ec6fc4e?w=900&q=80', // dark plant leaves
    'https://images.unsplash.com/photo-1558618047-f8e6df01a5d3?w=900&q=80', // dark ocean waves
    'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=900&q=80', // betta fish dark bg
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80', // dark mountain peak
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=900&q=80', // dark misty mountains
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=900&q=80', // galaxy purple
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80', // dark forest
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=900&q=80', // mountain lake dark
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80', // dark ocean horizon
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=900&q=80', // dark purple night sky
    'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=900&q=80', // dark abstract texture
    'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?w=900&q=80', // dark rocky terrain
    'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=900&q=80', // dark neon bokeh
    'https://images.unsplash.com/photo-1496715976403-7e36dc43f17b?w=900&q=80', // dark teal abstract
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=80'  // dark water texture
  ];

  // ── BUBBLE COLORS ─────────────────────────────────────────────
  var BUBBLE_COLORS = [
    '#1a7a4a','#166638','#4f46e5','#3730a3',
    '#7c3aed','#6d28d9','#b45309','#92400e',
    '#0f766e','#115e59','#1d4ed8','#1e40af',
    '#0369a1','#075985','#0f4c5c','#164e63',
    '#4d7c0f','#3f6212','#be123c','#9f1239',
    '#6b7280','#4b5563'
  ];

  // ── PRESET THEME COMBOS ───────────────────────────────────────
  var PRESETS = [
    { wall: null,         color: '#1a7a4a' },
    { wall: 'linear-gradient(160deg,#0f2027,#203a43,#2c5364)', color: '#1a7a4a' },
    { wall: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',  color: '#4f46e5' },
    { wall: WALLPAPERS[0],  color: '#7c3aed' },
    { wall: WALLPAPERS[1],  color: '#4f46e5' },
    { wall: WALLPAPERS[6],  color: '#1a7a4a' },
    { wall: WALLPAPERS[11], color: '#1d4ed8' },
    { wall: WALLPAPERS[12], color: '#be123c' }
  ];

  // ── LOAD SAVED THEME ──────────────────────────────────────────
  var LS_KEY = 'chatTheme_' + roomKey;
  var theme = { wallpaper: null, bubbleColor: null, brightness: 1.0 };
  try { var saved = JSON.parse(localStorage.getItem(LS_KEY)); if (saved) theme = saved; } catch(e) {}

  // Preview state
  var _pvWall  = null;
  var _pvColor = null;
  var _pvBri   = 1.0;
  var _pvIdx   = 0;

  // ── APPLY SAVED THEME TO CHAT ─────────────────────────────────
  function applyTheme() {
    // For funjokes/chatroom: apply directly to #msgs / #msgsWall (they fill the screen already)
    var scrollTargets = ['msgs', 'msgsWall'];
    scrollTargets.forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (theme.wallpaper) {
        if (theme.wallpaper.startsWith('http') || theme.wallpaper.startsWith('data:')) {
          el.style.backgroundImage    = 'url(' + theme.wallpaper + ')';
          el.style.backgroundSize     = 'cover';
          el.style.backgroundPosition = 'center top';
          el.style.backgroundAttachment = 'scroll';
          el.style.backgroundRepeat   = 'no-repeat';
          el.style.backgroundColor    = '';
        } else if (theme.wallpaper.startsWith('#')) {
          el.style.backgroundImage = 'none';
          el.style.backgroundColor = theme.wallpaper;
        } else {
          el.style.backgroundImage    = theme.wallpaper;
          el.style.backgroundSize     = 'cover';
          el.style.backgroundPosition = 'center top';
          el.style.backgroundAttachment = 'scroll';
          el.style.backgroundRepeat   = 'no-repeat';
          el.style.backgroundColor    = '';
        }
        el.classList.add('has-wallpaper');
        el.style.filter = (theme.brightness && theme.brightness < 1)
          ? 'brightness(' + theme.brightness + ')' : '';
      } else {
        el.style.backgroundImage = '';
        el.style.backgroundColor = '';
        el.style.filter = '';
        el.style.backgroundAttachment = '';
        el.classList.remove('has-wallpaper');
      }
    });

    // For classroom chat (#chatMessages inside home.html scroll container):
    // Use a fixed-position overlay div so wallpaper covers the full chat area
    var chatMsg = document.getElementById('chatMessages');
    if (chatMsg) {
      var wallId = '_classroomWallFixed';
      var wall = document.getElementById(wallId);
      if (theme.wallpaper) {
        if (!wall) {
          wall = document.createElement('div');
          wall.id = wallId;
          wall.style.cssText = 'position:fixed;top:56px;left:0;right:0;bottom:56px;z-index:0;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;';
          // Insert before mainContent so it sits behind everything
          var main = document.getElementById('mainContent');
          if (main && main.parentNode) main.parentNode.insertBefore(wall, main);
          else document.body.appendChild(wall);
        }
        if (theme.wallpaper.startsWith('http') || theme.wallpaper.startsWith('data:')) {
          wall.style.backgroundImage = 'url(' + theme.wallpaper + ')';
          wall.style.backgroundColor = '';
        } else if (theme.wallpaper.startsWith('#')) {
          wall.style.backgroundImage = 'none';
          wall.style.backgroundColor = theme.wallpaper;
        } else {
          wall.style.backgroundImage = theme.wallpaper;
          wall.style.backgroundColor = '';
        }
        wall.style.filter = (theme.brightness && theme.brightness < 1)
          ? 'brightness(' + theme.brightness + ')' : '';
        wall.style.display = 'block';
        // Make chatMessages background transparent so wall shows through
        chatMsg.style.background = 'transparent';
        var wrap = chatMsg.parentElement;
        if (wrap) wrap.style.background = 'transparent';
      } else {
        if (wall) wall.style.display = 'none';
        chatMsg.style.background = '';
        var wrap2 = chatMsg.parentElement;
        if (wrap2) wrap2.style.background = '';
      }
    }

        // Also toggle mainContent transparency for classroom chat (home.html)
        var mainContent = document.getElementById('mainContent');
        if (mainContent) {
          if (theme.wallpaper) mainContent.classList.add('chat-wallpaper-mode');
          else mainContent.classList.remove('chat-wallpaper-mode');
        }

    // Bubble colour override
    var sid = 'chatThemeStyle';
    var sel = document.getElementById(sid);
    if (!sel) { sel = document.createElement('style'); sel.id = sid; document.head.appendChild(sel); }
    sel.textContent = theme.bubbleColor
      ? '.bubble.mine{background:' + theme.bubbleColor + '!important;}' +
        '#bubble_mine_override{background:' + theme.bubbleColor + '!important;}'
      : '';
  }

  function saveAndApply() {
    localStorage.setItem(LS_KEY, JSON.stringify(theme));
    applyTheme();
  }

  // ── BUILD THE FULL MODAL HTML ─────────────────────────────────
  var host = document.createElement('div');
  host.id = 'chatThemeContainer';
  host.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9500;background:#111827;font-family:inherit;overflow:hidden';

  // Preset thumbnails
  var presetHtml = PRESETS.map(function(p, i) {
    var bg = !p.wall ? '#111827'
           : p.wall.startsWith('http') ? 'url(' + p.wall + ') center/cover'
           : p.wall;
    return '<div id="pt_' + i + '" onclick="__ct.pickPreset(' + i + ')" style="' +
      'position:relative;border-radius:14px;overflow:hidden;aspect-ratio:.56;cursor:pointer;' +
      'border:2px solid transparent;background:' + bg + ';min-height:110px">' +
      '<div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:72%;display:flex;flex-direction:column;gap:4px">' +
        '<div style="height:12px;background:rgba(255,255,255,.2);border-radius:6px;width:80%"></div>' +
        '<div style="height:12px;background:' + p.color + ';border-radius:6px;align-self:flex-end;width:88%"></div>' +
      '</div></div>';
  }).join('');

  // Colour circles
  var colorHtml = BUBBLE_COLORS.map(function(c) {
    return '<div id="cc_' + c.slice(1) + '" onclick="__ct.pickColor(\'' + c + '\')" ' +
      'style="width:66px;height:66px;border-radius:50%;background:' + c + ';cursor:pointer;' +
      'transition:transform .12s,outline .12s;-webkit-tap-highlight-color:transparent" ' +
      'ontouchstart="this.style.transform=\'scale(.88)\'" ontouchend="this.style.transform=\'\'"></div>';
  }).join('');

  // Wallpaper thumbnails
  var wallHtml = WALLPAPERS.map(function(w, i) {
    return '<div onclick="__ct.previewWall(' + i + ')" style="' +
      'aspect-ratio:.56;border-radius:14px;overflow:hidden;cursor:pointer;min-height:110px;' +
      'background:url(' + w + ') center/cover no-repeat"></div>';
  }).join('');

  host.innerHTML =
  /* PAGE 1 — Theme picker */
  '<div id="ctp1" style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;flex-direction:column;overflow:hidden">' +
    '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#1f2937;border-bottom:1px solid #374151;flex-shrink:0">' +
      '<button onclick="__ct.close()" style="width:36px;height:36px;background:#374151;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<span style="font-weight:700;font-size:17px;color:#fff">Chat theme</span>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:14px">' +
      '<p style="font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin:0 0 10px">Themes</p>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + presetHtml + '</div>' +
      '<p style="font-size:12px;color:#6b7280;text-align:center;margin:14px 0 18px;line-height:1.5">The chat color and wallpaper will both change.</p>' +
      '<p style="font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin:0 0 4px">Customize</p>' +
      '<div style="background:#1f2937;border-radius:14px;overflow:hidden">' +
        '<button onclick="__ct.goTo(2)" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;border-bottom:1px solid rgba(55,65,81,.5);cursor:pointer;padding:15px 14px;color:#fff;-webkit-tap-highlight-color:transparent">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +
          '<span style="font-size:15px;font-weight:500">Chat color</span>' +
        '</button>' +
        '<button onclick="__ct.goTo(3)" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;cursor:pointer;padding:15px 14px;color:#fff;-webkit-tap-highlight-color:transparent">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
          '<span style="font-size:15px;font-weight:500">Wallpaper</span>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>' +

  /* PAGE 2 — Chat color */
  '<div id="ctp2" style="position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column">' +
    '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#1f2937;border-bottom:1px solid #374151;flex-shrink:0">' +
      '<button onclick="__ct.goTo(1)" style="width:36px;height:36px;background:#374151;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<span style="font-weight:700;font-size:17px;color:#fff">Chat color</span>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:20px">' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;justify-items:center">' + colorHtml + '</div>' +
    '</div>' +
  '</div>' +

  /* PAGE 3 — Wallpaper */
  '<div id="ctp3" style="position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#1f2937;border-bottom:1px solid #374151;flex-shrink:0">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<button onclick="__ct.goTo(1)" style="width:36px;height:36px;background:#374151;border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
        '</button>' +
        '<span style="font-weight:700;font-size:17px;color:#fff">Wallpaper</span>' +
      '</div>' +
      '<div style="position:relative">' +
        '<button id="wallDotBtn" onclick="__ct.toggleWallMenu()" style="width:36px;height:36px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>' +
        '</button>' +
        '<div id="wallDotMenu" style="display:none;position:absolute;right:0;top:40px;background:#1f2937;border:1px solid #374151;border-radius:14px;min-width:190px;padding:6px;z-index:10;box-shadow:0 8px 30px #000b">' +
          '<button onclick="__ct.resetWallpaper()" style="display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;cursor:pointer;padding:12px 14px;color:#fff;font-size:14px;border-radius:10px">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>' +
            'Reset wallpaper' +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div style="flex:1;overflow-y:auto;padding:14px">' +
      '<button onclick="__ct.galleryPick()" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;border-bottom:1px solid rgba(55,65,81,.5);cursor:pointer;padding:14px 4px;color:#fff;-webkit-tap-highlight-color:transparent">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
        '<span style="font-size:15px">Choose from gallery</span>' +
      '</button>' +
      '<button onclick="__ct.colorPick()" style="display:flex;align-items:center;gap:14px;width:100%;background:none;border:none;border-bottom:1px solid rgba(55,65,81,.5);cursor:pointer;padding:14px 4px;color:#fff;margin-bottom:14px;-webkit-tap-highlight-color:transparent">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
        '<span style="font-size:15px">Set a color</span>' +
      '</button>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + wallHtml + '</div>' +
    '</div>' +
  '</div>' +

  /* PAGE 4 — Preview */
  '<div id="ctp4" style="position:absolute;top:0;left:0;right:0;bottom:0;display:none;flex-direction:column;overflow:hidden">' +
    '<div id="pvBg" style="position:absolute;top:0;left:0;right:0;bottom:0;background-size:cover;background-position:center;background-repeat:no-repeat;transition:filter .25s"></div>' +
    '<div style="position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(0,0,0,.28);flex-shrink:0">' +
      '<button onclick="__ct.goTo(3)" style="width:36px;height:36px;background:rgba(0,0,0,.4);border-radius:10px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
      '</button>' +
      '<span style="font-weight:700;font-size:17px;color:#fff">Preview</span>' +
      '<button onclick="__ct.confirmWallpaper()" style="width:42px;height:42px;background:#25d366;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(37,211,102,.4)">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div style="position:relative;z-index:2;display:flex;justify-content:center;padding:8px 0;flex-shrink:0">' +
      '<span style="background:rgba(0,0,0,.45);color:#fff;font-size:12px;padding:4px 14px;border-radius:20px;backdrop-filter:blur(4px)">Today</span>' +
    '</div>' +
    '<div style="position:relative;z-index:2;flex:1;padding:10px 14px;display:flex;flex-direction:column;gap:8px">' +
      '<div style="max-width:82%">' +
        '<div style="padding:10px 14px;border-radius:18px 18px 18px 4px;font-size:14px;color:#fff;background:rgba(31,41,55,.9);backdrop-filter:blur(4px);line-height:1.4">Swipe left or right to preview more wallpapers 🌄✨</div>' +
        '<div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:3px;padding:0 4px">9:07 AM</div>' +
      '</div>' +
      '<div style="max-width:82%;align-self:flex-end">' +
        '<div id="pvBubble" style="padding:10px 14px;border-radius:18px 18px 4px 18px;font-size:14px;color:#fff;line-height:1.4">Only you see your chat wallpaper 😊</div>' +
        '<div style="font-size:10px;color:rgba(255,255,255,.7);margin-top:3px;padding:0 4px;text-align:right">9:07 AM ✓✓</div>' +
      '</div>' +
    '</div>' +
    '<div id="pvDots" style="position:relative;z-index:2;display:flex;justify-content:center;align-items:center;gap:5px;padding:6px 0 10px;flex-shrink:0"></div>' +
    /* Brightness slider — vertical right side */
    '<div style="position:absolute;right:10px;top:50%;transform:translateY(-50%);z-index:3">' +
      '<div style="background:rgba(0,0,0,.55);border-radius:30px;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:8px;backdrop-filter:blur(6px)">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="5"/><path stroke="white" stroke-width="2" stroke-linecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' +
        '<input type="range" id="briSlider" min="20" max="100" value="100" ' +
          'style="writing-mode:vertical-lr;direction:rtl;-webkit-appearance:slider-vertical;width:22px;height:110px;cursor:pointer;accent-color:#25d366" ' +
          'oninput="__ct.updateBri(this.value)">' +
      '</div>' +
    '</div>' +
    '<div id="pvColorDot" style="position:absolute;bottom:14px;left:14px;z-index:3;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>' +
    '<div style="position:absolute;bottom:14px;right:14px;z-index:3">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' +
    '</div>' +
  '</div>';

  document.body.appendChild(host);

  // ── CONTROLLER ────────────────────────────────────────────────
  window.__ct = {
    open: function() {
      host.style.display = 'block';
      this.goTo(1);
      this._highlightColor();
    },
    close: function() { host.style.display = 'none'; },
    goTo: function(n) {
      [1,2,3,4].forEach(function(i) {
        var p = document.getElementById('ctp' + i);
        if (p) p.style.display = (i === n) ? 'flex' : 'none';
      });
    },

    // Presets
    pickPreset: function(i) {
      var p = PRESETS[i];
      theme.bubbleColor = p.color;
      theme.wallpaper   = p.wall;
      saveAndApply();
      PRESETS.forEach(function(_, j) {
        var el = document.getElementById('pt_' + j);
        if (el) el.style.borderColor = (j === i) ? '#fff' : 'transparent';
      });
      showToast('Theme applied!');
    },

    // Color
    pickColor: function(c) {
      theme.bubbleColor = c;
      saveAndApply();
      this._highlightColor();
      showToast('Chat color updated!');
    },
    _highlightColor: function() {
      BUBBLE_COLORS.forEach(function(c) {
        var el = document.getElementById('cc_' + c.slice(1));
        if (el) el.style.outline = (c === theme.bubbleColor)
          ? '3px solid white' : 'none';
      });
    },

    // Wallpaper menu
    toggleWallMenu: function() {
      var m = document.getElementById('wallDotMenu');
      if (m) m.style.display = (m.style.display === 'none' ? 'block' : 'none');
    },
    resetWallpaper: function() {
      theme.wallpaper  = null;
      theme.brightness = 1.0;
      saveAndApply();
      this.toggleWallMenu();
      this.goTo(3);
      showToast('Wallpaper reset');
    },
    galleryPick: function() {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function() {
        if (!inp.files[0]) return;
        var r = new FileReader();
        r.onload = function(e) { window.__ct._openPreview(e.target.result, -1); };
        r.readAsDataURL(inp.files[0]);
      };
      inp.click();
    },
    colorPick: function() {
      var inp = document.createElement('input');
      inp.type = 'color';
      inp.value = (theme.wallpaper && theme.wallpaper.startsWith('#')) ? theme.wallpaper : '#1a1a2e';
      inp.onchange = function() {
        theme.wallpaper  = inp.value;
        theme.brightness = 1.0;
        saveAndApply();
        showToast('Wallpaper color set!');
      };
      inp.click();
    },
    previewWall: function(i) { this._openPreview(WALLPAPERS[i], i); },
    _openPreview: function(wall, idx) {
      _pvWall  = wall;
      _pvIdx   = idx;
      _pvColor = theme.bubbleColor;
      _pvBri   = theme.brightness || 1.0;
      this.goTo(4);
      this._refreshPreview();
      this._buildDots();
      var sl = document.getElementById('briSlider');
      if (sl) sl.value = Math.round(_pvBri * 100);
    },
    _refreshPreview: function() {
      var bg = document.getElementById('pvBg');
      if (bg) {
        if (_pvWall && (_pvWall.startsWith('http') || _pvWall.startsWith('data:'))) {
          bg.style.backgroundImage = 'url(' + _pvWall + ')';
          bg.style.backgroundColor = '';
        } else if (_pvWall && _pvWall.startsWith('#')) {
          bg.style.backgroundImage = 'none';
          bg.style.backgroundColor = _pvWall;
        } else {
          bg.style.backgroundImage = 'none';
          bg.style.backgroundColor = '#111827';
        }
        bg.style.filter = (_pvBri < 1) ? 'brightness(' + _pvBri + ')' : '';
      }
      var bub = document.getElementById('pvBubble');
      if (bub) bub.style.background = (_pvColor || theme.bubbleColor || '#9333ea');
      var dot = document.getElementById('pvColorDot');
      if (dot) dot.style.background = (_pvColor || theme.bubbleColor || '#9333ea');
    },
    _buildDots: function() {
      var el = document.getElementById('pvDots');
      if (!el) return;
      var html = '';
      for (var i = 0; i < WALLPAPERS.length; i++) {
        var active = (i === _pvIdx);
        html += '<div style="width:' + (active ? '18px' : '7px') + ';height:7px;border-radius:4px;' +
          'background:' + (active ? 'white' : 'rgba(255,255,255,.35)') + ';transition:all .2s;cursor:pointer" ' +
          'onclick="__ct._jumpTo(' + i + ')"></div>';
      }
      el.innerHTML = html;
    },
    _jumpTo: function(i) {
      _pvWall = WALLPAPERS[i]; _pvIdx = i;
      this._refreshPreview(); this._buildDots();
    },
    updateBri: function(v) {
      _pvBri = v / 100;
      var bg = document.getElementById('pvBg');
      if (bg) bg.style.filter = (_pvBri < 1) ? 'brightness(' + _pvBri + ')' : '';
    },
    confirmWallpaper: function() {
      theme.wallpaper  = _pvWall;
      theme.brightness = _pvBri;
      saveAndApply();
      this.close();
      showToast('✅ Wallpaper applied!');
    }
  };

  // Swipe on preview page
  var pv4 = document.getElementById('ctp4');
  var _sx = 0;
  pv4.addEventListener('touchstart', function(e) { _sx = e.touches[0].clientX; }, {passive:true});
  pv4.addEventListener('touchend', function(e) {
    var dx = e.changedTouches[0].clientX - _sx;
    if (Math.abs(dx) < 40) return;
    var ni = _pvIdx + (dx < 0 ? 1 : -1);
    if (ni >= 0 && ni < WALLPAPERS.length) {
      _pvWall = WALLPAPERS[ni]; _pvIdx = ni;
      window.__ct._refreshPreview(); window.__ct._buildDots();
    }
  }, {passive:true});

  // Apply saved theme immediately
  applyTheme();

  // Re-apply when user returns to the page (tab/app switch)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') applyTheme();
  });
  // Also re-apply after any dynamic content loads (classroom chat rebuilds #chatMessages)
  window.addEventListener('chatLoaded', function() { applyTheme(); });
}
