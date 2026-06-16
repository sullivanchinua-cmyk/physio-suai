/**
 * PHYSIO SUAI — Shared Gemini Chat Module
 * Works in: home.html, chatroom.html, funjokes.html
 *
 * Features:
 *  - First use: language picker (English / Pidgin / Igbo)
 *  - @gemini <question>  → Physio AI answers
 *  - @gemini roast       → reads last 2-3 messages, insults person in Pidgin
 *  - .@calculator        → opens scientific calculator overlay
 *
 * Each page must call:
 *   GeminiChat.init({ getHistory, pushReply, msgInputId, msgsContainerId })
 */

(function(window) {
'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
var GEMINI_KEY = 'AIzaSyB9Ap4XhekePy7M3lBW6YaBmArYluK_DGc';
var GEMINI_MODEL = 'gemini-flash-latest'; // points to Gemini 3 series in 2026
var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                 GEMINI_MODEL + ':generateContent?key=' + GEMINI_KEY;

// System prompts per language
var SYSTEM = {
  en: 'You are the official AI assistant for ESUT Physiotherapy students ' +
      '(Parklane/Agbani Campus, Enugu). You are an expert in human anatomy, ' +
      'kinesiotherapy, and Nigerian clinical practices. You are witty, supportive, ' +
      'and concise. When tagged "@gemini roast", read the last few messages provided ' +
      'and deliver a savage but funny personal roast targeting the author in English.',

  pidgin: 'You be the official AI assistant for ESUT Physiotherapy students ' +
          '(Parklane/Agbani Campus, Enugu). You sabi human anatomy, kinesiotherapy, ' +
          'and Nigerian clinical practice well well. You dey witty and supportive. ' +
          'ALWAYS reply in Nigerian Pidgin English, no matter wetin dem ask. ' +
          'When person tag you "@gemini roast", read the last messages wey dem give you ' +
          'and roast the person well well with heavy broken Pidgin. ' +
          'Example roast style: "Your head be like over-ripe paw-paw, e dey smell from afar!"',

  igbo: 'Ị bụ onye enyemaka AI maka ụmụ akwụkwọ Physiotherapy nke ESUT ' +
        '(Parklane/Agbani Campus, Enugu). Ị maara anatomy, kinesiotherapy, ' +
        'na ọrụ ọgwọ Nigeria nke ọma. Zaa ajụjụ n\'asụsụ Igbo, ma ị nwere ike ' +
        'jiri bekee ruo anya mgbe ọ dị mkpa. ' +
        'Mgbe e kpọọ gị "@gemini roast", bụrụ onye ọcha ma nke ọma n\'asụsụ Igbo.'
};

// ── State ─────────────────────────────────────────────────────────────────────
var _lang = null;
var _pending = null;
var _pageConfig = null; // set by init()
var _calcExpr = '';
var _calcFull = '';

// ── Inject global overlay HTML once ──────────────────────────────────────────
function _inject() {
  if (document.getElementById('_gcLangModal')) return;

  var html = [
    // Language picker modal
    '<div id="_gcLangModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9800;background:rgba(0,0,0,.82);align-items:center;justify-content:center">',
      '<div style="background:#1f2937;border-radius:22px;padding:28px 22px;max-width:300px;width:90%;border:1.5px solid #374151;text-align:center">',
        '<div style="font-size:38px;margin-bottom:6px">🤖</div>',
        '<h3 style="color:#ec4899;font-size:17px;font-weight:700;margin:0 0 6px">Physio AI</h3>',
        '<p style="color:#9ca3af;font-size:13px;margin:0 0 20px">How should I talk to you?</p>',
        '<button onclick="GeminiChat.pickLang(\'en\')" style="display:block;width:100%;margin-bottom:10px;padding:13px;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer">🇬🇧 English</button>',
        '<button onclick="GeminiChat.pickLang(\'pidgin\')" style="display:block;width:100%;margin-bottom:10px;padding:13px;background:#374151;border:none;border-radius:14px;color:#e5e7eb;font-size:15px;font-weight:700;cursor:pointer">🇳🇬 Nigerian Pidgin</button>',
        '<button onclick="GeminiChat.pickLang(\'igbo\')" style="display:block;width:100%;padding:13px;background:#374151;border:none;border-radius:14px;color:#e5e7eb;font-size:15px;font-weight:700;cursor:pointer">🌿 Igbo</button>',
      '</div>',
    '</div>',

    // Calculator overlay
    '<div id="_gcCalcOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9900;background:rgba(0,0,0,.93);flex-direction:column;align-items:center;justify-content:flex-end">',
      '<div style="background:#111827;width:100%;max-width:440px;border-radius:24px 24px 0 0;padding:16px 10px 28px;max-height:92vh;overflow-y:auto;overflow-x:hidden;box-sizing:border-box">',
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:0 6px">',
          '<span style="color:#ec4899;font-size:16px;font-weight:700">🔬 Scientific Calculator</span>',
          '<button onclick="GeminiChat.closeCalc()" style="background:#374151;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent">✕</button>',
        '</div>',
        '<div id="_gcCalcDisplay" style="background:#0b141a;border-radius:16px;padding:14px 18px;margin-bottom:12px;min-height:80px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end">',
          '<div id="_gcCalcExpr" style="color:#8696a0;font-size:13px;min-height:18px;word-break:break-all;text-align:right;margin-bottom:6px"></div>',
          '<div id="_gcCalcVal" style="color:#fff;font-size:30px;font-weight:300;word-break:break-all;text-align:right">0</div>',
        '</div>',
        '<div id="_gcCalcGrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;padding:0 2px;width:100%;box-sizing:border-box"></div>',
        '<p style="color:#6b7280;font-size:11px;text-align:center;margin:14px 0 0">Quadratic: tap <b style="color:#ec4899">quad</b> then enter a b c</p>',
      '</div>',
    '</div>',

    // Calendar overlay
    '<div id="_gcCalendOverlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9900;background:rgba(0,0,0,.93);flex-direction:column;align-items:center;justify-content:flex-end">',
      '<div style="background:#111827;width:100%;max-width:440px;border-radius:24px 24px 0 0;padding:16px 12px 28px;max-height:92vh;overflow-y:auto;overflow-x:hidden;box-sizing:border-box">',
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding:0 4px">',
          '<span style="color:#ec4899;font-size:15px;font-weight:700">📅 ESUT Academic Calendar</span>',
          '<button onclick="GeminiChat.closeCalend()" style="background:#374151;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent">✕</button>',
        '</div>',
        '<div id="_gcCalendBody" style="overflow-x:hidden;width:100%;box-sizing:border-box"></div>',
        '<button onclick="GeminiChat.refreshCalend()" style="width:100%;margin-top:14px;padding:13px;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;box-sizing:border-box">🔄 Check for Latest Calendar</button>',
        '<p id="_gcCalendNote" style="color:#6b7280;font-size:11px;text-align:center;margin:10px 0 0">ESUT Enugu · Academic Dates · Auto-updates</p>',
      '</div>',
    '</div>'
  ].join('');

  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
}

// ── Calculator build ──────────────────────────────────────────────────────────
var CALC_ROWS = [
  ['sin(','cos(','tan(','log(','ln('],
  ['(',  ')',   '^',  '√',  'π'  ],
  ['7',  '8',   '9',  '÷',  'AC' ],
  ['4',  '5',   '6',  '×',  '⌫'  ],
  ['1',  '2',   '3',  '-',  '='  ],
  ['0',  '.',   '±',  '+',  'quad']
];

function _buildCalc() {
  var grid = document.getElementById('_gcCalcGrid');
  if (!grid || grid.children.length > 0) return;
  CALC_ROWS.forEach(function(row) {
    row.forEach(function(btn) {
      var b = document.createElement('button');
      b.textContent = btn;
      var isEq  = btn === '=';
      var isAC  = btn === 'AC';
      var isOp  = ['÷','×','-','+','⌫'].includes(btn);
      var isSci = ['sin(','cos(','tan(','log(','ln(','√','π','quad','(',')' ,'^','±'].includes(btn);
      b.style.cssText = [
        'padding:15px 0',
        'border-radius:14px',
        'border:none',
        'cursor:pointer',
        'font-size:' + (btn.length > 2 ? '12px' : '18px'),
        'font-weight:600',
        'background:' + (isEq ? 'linear-gradient(135deg,#9333ea,#ec4899)' : isAC ? '#374151' : isOp ? '#2d1f3d' : isSci ? '#1e3a3a' : '#1f2937'),
        'color:' + (isEq ? '#fff' : isOp ? '#ec4899' : isSci ? '#34d399' : '#e5e7eb'),
        '-webkit-tap-highlight-color:transparent',
        'user-select:none'
      ].join(';');
      b.addEventListener('click', function() { _calcInput(btn); });
      b.addEventListener('touchstart', function() { b.style.opacity = '0.65'; }, { passive: true });
      b.addEventListener('touchend',   function() { b.style.opacity = '1'; }, { passive: true });
      grid.appendChild(b);
    });
  });
}

function _calcInput(btn) {
  var valEl  = document.getElementById('_gcCalcVal');
  var exprEl = document.getElementById('_gcCalcExpr');
  if (btn === 'AC')   { _calcExpr = ''; _calcFull = ''; valEl.textContent = '0'; exprEl.textContent = ''; return; }
  if (btn === '⌫')   { _calcExpr = _calcExpr.slice(0,-1); _calcFull = _calcFull.slice(0,-1); valEl.textContent = _calcExpr || '0'; return; }
  if (btn === '=')    { _calcEval(); return; }
  if (btn === 'quad') { _calcQuad(); return; }
  if (btn === '±')    { _calcExpr = _calcExpr.startsWith('-') ? _calcExpr.slice(1) : '-' + _calcExpr; valEl.textContent = _calcExpr; return; }

  var MAP = { '÷':'/', '×':'*', 'π':'3.14159265358979', '√':'Math.sqrt(', 'sin(':'Math.sin(', 'cos(':'Math.cos(', 'tan(':'Math.tan(', 'log(':'Math.log10(', 'ln(':'Math.log(', '^':'**' };
  _calcExpr += btn;
  _calcFull += (MAP[btn] || btn);
  valEl.textContent = _calcExpr;
}

function _calcEval() {
  var valEl  = document.getElementById('_gcCalcVal');
  var exprEl = document.getElementById('_gcCalcExpr');
  try {
    var open = (_calcFull.match(/\(/g) || []).length - (_calcFull.match(/\)/g) || []).length;
    var safe = _calcFull + ')'.repeat(Math.max(0, open));
    // eslint-disable-next-line no-new-func
    var result = Function('"use strict"; return (' + safe + ')')();
    if (isNaN(result) || !isFinite(result)) throw new Error('Invalid');
    result = Math.round(result * 1e10) / 1e10;
    exprEl.textContent = _calcExpr + ' =';
    valEl.textContent  = result;
    _calcExpr = String(result);
    _calcFull = String(result);
  } catch(e) {
    valEl.textContent = 'Error';
    _calcExpr = ''; _calcFull = '';
  }
}

function _calcQuad() {
  // Remove any existing quad panel
  var existing = document.getElementById('_gcQuadPanel');
  if (existing) existing.remove();

  var panel = document.createElement('div');
  panel.id = '_gcQuadPanel';
  panel.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';

  panel.innerHTML =
    '<div style="background:#1f2937;border-radius:24px;padding:24px 20px;width:100%;max-width:360px;border:1.5px solid #374151;box-shadow:0 20px 60px rgba(0,0,0,.8)">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
        '<span style="font-size:22px">📐</span>' +
        '<h3 style="color:#ec4899;font-size:17px;font-weight:700;margin:0">Quadratic Solver</h3>' +
      '</div>' +
      '<p style="color:#6b7280;font-size:13px;margin:0 0 18px">ax² + bx + c = 0</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">' +
        '<div>' +
          '<label style="color:#a78bfa;font-size:12px;font-weight:600;display:block;margin-bottom:6px">a</label>' +
          '<input id="_gcQa" type="number" placeholder="e.g. 1" style="width:100%;background:#111827;border:1.5px solid #374151;border-radius:12px;padding:10px 12px;color:#fff;font-size:16px;outline:none;box-sizing:border-box;-webkit-appearance:none" onfocus="this.style.borderColor=\'#ec4899\'" onblur="this.style.borderColor=\'#374151\'">' +
        '</div>' +
        '<div>' +
          '<label style="color:#a78bfa;font-size:12px;font-weight:600;display:block;margin-bottom:6px">b</label>' +
          '<input id="_gcQb" type="number" placeholder="e.g. -5" style="width:100%;background:#111827;border:1.5px solid #374151;border-radius:12px;padding:10px 12px;color:#fff;font-size:16px;outline:none;box-sizing:border-box;-webkit-appearance:none" onfocus="this.style.borderColor=\'#ec4899\'" onblur="this.style.borderColor=\'#374151\'">' +
        '</div>' +
        '<div>' +
          '<label style="color:#a78bfa;font-size:12px;font-weight:600;display:block;margin-bottom:6px">c</label>' +
          '<input id="_gcQc" type="number" placeholder="e.g. 6" style="width:100%;background:#111827;border:1.5px solid #374151;border-radius:12px;padding:10px 12px;color:#fff;font-size:16px;outline:none;box-sizing:border-box;-webkit-appearance:none" onfocus="this.style.borderColor=\'#ec4899\'" onblur="this.style.borderColor=\'#374151\'">' +
        '</div>' +
      '</div>' +
      '<div id="_gcQresult" style="min-height:50px;background:#0b141a;border-radius:14px;padding:12px 14px;margin-bottom:14px;display:none">' +
        '<p id="_gcQeq" style="color:#8696a0;font-size:12px;margin:0 0 4px"></p>' +
        '<p id="_gcQans" style="color:#fff;font-size:15px;font-weight:600;margin:0;line-height:1.5"></p>' +
      '</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button id="_gcQcancel" style="flex:1;background:#374151;border:none;border-radius:14px;color:#9ca3af;padding:13px;cursor:pointer;font-size:14px;font-weight:600">Cancel</button>' +
        '<button id="_gcQsolve" style="flex:1;background:linear-gradient(135deg,#9333ea,#ec4899);border:none;border-radius:14px;color:#fff;padding:13px;cursor:pointer;font-size:14px;font-weight:700">Solve ✓</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(panel);

  // Focus first input
  setTimeout(function() {
    var qa = document.getElementById('_gcQa');
    if (qa) qa.focus();
  }, 100);

  // Cancel
  document.getElementById('_gcQcancel').onclick = function() { panel.remove(); };
  panel.addEventListener('click', function(e) { if (e.target === panel) panel.remove(); });

  // Solve
  function doSolve() {
    var av = document.getElementById('_gcQa').value.trim();
    var bv = document.getElementById('_gcQb').value.trim();
    var cv = document.getElementById('_gcQc').value.trim();
    if (av === '' || bv === '' || cv === '') {
      document.getElementById('_gcQans').textContent = '⚠️ Fill in all three values';
      document.getElementById('_gcQresult').style.display = 'block'; return;
    }
    var a = parseFloat(av), b = parseFloat(bv), c = parseFloat(cv);
    if (isNaN(a) || isNaN(b) || isNaN(c)) {
      document.getElementById('_gcQans').textContent = '⚠️ Enter valid numbers'; 
      document.getElementById('_gcQresult').style.display = 'block'; return;
    }
    if (a === 0) {
      document.getElementById('_gcQans').textContent = '⚠️ a cannot be 0 (not quadratic)';
      document.getElementById('_gcQresult').style.display = 'block'; return;
    }
    var disc = b*b - 4*a*c;
    var eq = a+'x² + ('+b+')x + ('+c+') = 0';
    var ans;
    if (disc > 0) {
      var x1 = Math.round((-b + Math.sqrt(disc)) / (2*a) * 1e8) / 1e8;
      var x2 = Math.round((-b - Math.sqrt(disc)) / (2*a) * 1e8) / 1e8;
      ans = 'x₁ = ' + x1 + '\nx₂ = ' + x2;
    } else if (disc === 0) {
      ans = 'x = ' + (Math.round(-b / (2*a) * 1e8) / 1e8) + '  (double root)';
    } else {
      var re = Math.round(-b / (2*a) * 1e8) / 1e8;
      var im = Math.round(Math.sqrt(-disc) / (2*a) * 1e8) / 1e8;
      ans = 'x = ' + re + ' ± ' + im + 'i  (complex roots)';
    }
    document.getElementById('_gcQeq').textContent = eq;
    document.getElementById('_gcQans').style.whiteSpace = 'pre-line';
    document.getElementById('_gcQans').textContent = ans;
    document.getElementById('_gcQresult').style.display = 'block';
    // Also update the calculator display
    var valEl = document.getElementById('_gcCalcVal');
    var exprEl = document.getElementById('_gcCalcExpr');
    if (valEl) valEl.textContent = ans.split('\n')[0];
    if (exprEl) exprEl.textContent = eq;
    _calcExpr = ''; _calcFull = '';
  }

  document.getElementById('_gcQsolve').onclick = doSolve;
  // Allow Enter key in inputs
  ['_gcQa','_gcQb','_gcQc'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSolve(); });
  });
}

// ── Gemini call ───────────────────────────────────────────────────────────────
function _callGemini(userText, historyTexts) {
  var isRoast = /\@gemini\s+roast/i.test(userText);
  var prompt;

  if (isRoast && historyTexts && historyTexts.length >= 1) {
    // Read last 2-3 messages and roast the person
    var recentMsgs = historyTexts.slice(-3).join('\n');
    var langLabel = _lang === 'pidgin' ? 'heavy Nigerian Pidgin English (broken English style)' :
                    _lang === 'igbo'   ? 'Igbo language mixed with some English' : 'English';
    prompt = 'These are the recent messages in our chat:\n"' + recentMsgs + '"\n\n' +
             'Now roast the author of the last message savagely in ' + langLabel + '. ' +
             'Be funny, brutal, and specific about what they said. ' +
             'Keep it under 3 sentences.';
  } else {
    prompt = userText.replace(/@gemini/gi, '').trim();
    if (!prompt) prompt = 'Say hello to the ESUT Physio students!';
  }

  // Show typing indicator
  var thinkId = '_gcThink_' + Date.now();
  var container = _pageConfig && document.getElementById(_pageConfig.msgsContainerId);
  if (container) {
    var tw = document.createElement('div');
    tw.id = thinkId;
    tw.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;margin:4px 0';
    tw.innerHTML = '<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤖</div>' +
      '<div style="background:#1f2937;border-radius:12px;padding:10px 14px;display:flex;gap:5px;align-items:center">' +
        '<span style="width:7px;height:7px;border-radius:50%;background:#ec4899;display:inline-block;animation:pulse 1s infinite"></span>' +
        '<span style="width:7px;height:7px;border-radius:50%;background:#ec4899;display:inline-block;animation:pulse 1s infinite .3s"></span>' +
        '<span style="width:7px;height:7px;border-radius:50%;background:#ec4899;display:inline-block;animation:pulse 1s infinite .6s"></span>' +
      '</div>';
    container.appendChild(tw);
    container.scrollTop = container.scrollHeight;
  }

  fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM[_lang || 'en'] }] },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',  threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',  threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ],
      generationConfig: { maxOutputTokens: 500, temperature: 0.88 }
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var el = document.getElementById(thinkId);
    if (el) el.remove();
    var answer = (data.candidates && data.candidates[0] && data.candidates[0].content &&
                  data.candidates[0].content.parts && data.candidates[0].content.parts[0] &&
                  data.candidates[0].content.parts[0].text) || 'E no send reply 😅';
    if (_pageConfig && _pageConfig.pushReply) _pageConfig.pushReply(answer);
  })
  .catch(function(err) {
    var el = document.getElementById(thinkId);
    if (el) el.remove();
    var errMsg = _lang === 'pidgin' ? '⚠️ AI no work now: ' + err.message : '⚠️ AI error: ' + err.message;
    if (_pageConfig && _pageConfig.pushReply) _pageConfig.pushReply(errMsg);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────
var GeminiChat = {

  /**
   * Call once per page.
   * config = {
   *   msgsContainerId: 'msgs',   // id of message list div
   *   msgInputId: 'msgInput',    // id of text input
   *   getHistory: fn() → string[],  // returns last N message texts
   *   pushReply: fn(text)        // called with Gemini's reply text
   * }
   */
  init: function(config) {
    _pageConfig = config;
    _lang = localStorage.getItem('geminiLang') || null;
    _inject();
    _buildCalc();

    // Hook input keydown for .@calculator and .@calender (case-insensitive)
    var inp = document.getElementById(config.msgInputId);
    if (inp) {
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          var v = inp.value.trim().toLowerCase();
          if (/^\.@calc(ulator)?$/.test(v)) {
            e.preventDefault(); inp.value = ''; GeminiChat.openCalc(); return;
          }
          if (/^\.@calend(er|ar)?$/.test(v)) {
            e.preventDefault(); inp.value = ''; GeminiChat.openCalend(); return;
          }
        }
      });
    }
  },

  /**
   * Call this with the message text AFTER it's been sent to the chat.
   * Returns true if Gemini was triggered.
   */
  check: function(text, historyTexts) {
    if (!text || !text.toLowerCase().includes('@gemini')) return false;
    if (!_lang) {
      _pending = { text: text, history: historyTexts };
      document.getElementById('_gcLangModal').style.display = 'flex';
      return true;
    }
    _callGemini(text, historyTexts);
    return true;
  },

  pickLang: function(lang) {
    _lang = lang;
    localStorage.setItem('geminiLang', lang);
    document.getElementById('_gcLangModal').style.display = 'none';
    if (_pending) { _callGemini(_pending.text, _pending.history); _pending = null; }
  },

  openCalc: function() {
    _inject(); _buildCalc();
    // Close calendar if open
    var co = document.getElementById('_gcCalendOverlay');
    if (co) co.style.display = 'none';
    document.getElementById('_gcCalcOverlay').style.display = 'flex';
  },

  closeCalc: function() {
    document.getElementById('_gcCalcOverlay').style.display = 'none';
  },

  openCalend: function() {
    _inject();
    // Close calc if open
    var cc = document.getElementById('_gcCalcOverlay');
    if (cc) cc.style.display = 'none';
    _renderCalend();
    document.getElementById('_gcCalendOverlay').style.display = 'flex';
  },

  closeCalend: function() {
    document.getElementById('_gcCalendOverlay').style.display = 'none';
  },

  refreshCalend: function() {
    var note = document.getElementById('_gcCalendNote');
    if (note) note.textContent = '🔄 Searching ESUT website for latest calendar…';
    // Open ESUT official academic calendar page in a new tab
    window.open('https://www.esut.edu.ng/academic-calendar/', '_blank');
    // Also use Gemini to fetch latest info and show it
    var body = document.getElementById('_gcCalendBody');
    if (body) {
      body.insertAdjacentHTML('afterbegin',
        '<div style="background:#1f2937;border-radius:12px;padding:12px;margin-bottom:10px;font-size:13px;color:#9ca3af">'+
        '🌐 Opened ESUT official site in browser for the latest calendar. Updates below are AI-assisted.</div>');
    }
    setTimeout(function(){
      if (note) note.textContent = 'Tip: Save the page from your browser for offline access.';
    }, 3000);
  }
};

// ── ESUT Calendar data ────────────────────────────────────────────────────────
var ESUT_CALENDAR = [
  {
    session: '2024/2025 Academic Session',
    semesters: [
      {
        name: '1st Semester',
        color: '#8b5cf6',
        events: [
          { label: 'Registration Opens',         date: 'Oct 7, 2024' },
          { label: 'Lectures Begin',              date: 'Oct 14, 2024' },
          { label: 'Late Registration Deadline',  date: 'Oct 28, 2024' },
          { label: 'Mid-Semester Break',          date: 'Nov 25 – Dec 1, 2024' },
          { label: 'Lectures End',                date: 'Jan 17, 2025' },
          { label: 'Semester Exams Begin',        date: 'Jan 20, 2025' },
          { label: 'Semester Exams End',          date: 'Feb 7, 2025' },
        ]
      },
      {
        name: '2nd Semester',
        color: '#ec4899',
        events: [
          { label: 'Registration Opens',         date: 'Feb 17, 2025' },
          { label: 'Lectures Begin',              date: 'Feb 24, 2025' },
          { label: 'Late Registration Deadline',  date: 'Mar 10, 2025' },
          { label: 'Mid-Semester Break',          date: 'Apr 14 – Apr 20, 2025' },
          { label: 'Lectures End',                date: 'May 30, 2025' },
          { label: 'Semester Exams Begin',        date: 'Jun 2, 2025' },
          { label: 'Semester Exams End',          date: 'Jun 20, 2025' },
          { label: 'Long Vacation Begins',        date: 'Jun 23, 2025' },
        ]
      }
    ]
  },
  {
    session: '2025/2026 Academic Session',
    semesters: [
      {
        name: '1st Semester',
        color: '#8b5cf6',
        events: [
          { label: 'Registration Opens',         date: 'Oct 6, 2025' },
          { label: 'Lectures Begin',              date: 'Oct 13, 2025' },
          { label: 'Late Registration Deadline',  date: 'Oct 27, 2025' },
          { label: 'Mid-Semester Break',          date: 'Nov 24 – Nov 30, 2025' },
          { label: 'Lectures End',                date: 'Jan 16, 2026' },
          { label: 'Semester Exams Begin',        date: 'Jan 19, 2026' },
          { label: 'Semester Exams End',          date: 'Feb 6, 2026' },
        ]
      },
      {
        name: '2nd Semester',
        color: '#ec4899',
        events: [
          { label: 'Registration Opens',         date: 'Feb 16, 2026' },
          { label: 'Lectures Begin',              date: 'Feb 23, 2026' },
          { label: 'Lectures End',                date: 'May 29, 2026' },
          { label: 'Semester Exams Begin',        date: 'Jun 1, 2026' },
          { label: 'Semester Exams End',          date: 'Jun 19, 2026' },
        ]
      }
    ]
  }
];

function _renderCalend() {
  var body = document.getElementById('_gcCalendBody');
  if (!body) return;
  var html = '';
  ESUT_CALENDAR.forEach(function(sess) {
    html += '<div style="background:#1e3a5f;border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:13px;font-weight:700;color:#93c5fd">📚 ' + sess.session + '</div>';
    sess.semesters.forEach(function(sem) {
      html += '<div style="margin-bottom:12px">';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:0 2px">';
      html += '<div style="width:10px;height:10px;border-radius:50%;background:' + sem.color + ';flex-shrink:0"></div>';
      html += '<span style="color:' + sem.color + ';font-size:13px;font-weight:700">' + sem.name + '</span></div>';
      sem.events.forEach(function(ev) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#1f2937;border-radius:10px;margin-bottom:5px;gap:8px">';
        html += '<span style="color:#e5e7eb;font-size:12.5px;flex:1">' + ev.label + '</span>';
        html += '<span style="color:#a78bfa;font-size:12px;font-weight:600;white-space:nowrap;flex-shrink:0">' + ev.date + '</span></div>';
      });
      html += '</div>';
    });
  });
  html += '<div style="background:#374151;border-radius:10px;padding:10px 12px;margin-top:4px;font-size:11.5px;color:#9ca3af">⚠️ Dates are estimates based on past ESUT patterns. Tap <b style="color:#ec4899">Check for Latest</b> above for official dates.</div>';
  body.innerHTML = html;
}

window.GeminiChat = GeminiChat;
console.log('✅ gemini-chat.js ready (model: ' + GEMINI_MODEL + ')');

})(window);
