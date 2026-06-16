/**
 * PHYSIO SUAI - Custom Confirm Modal
 * Replaces all native confirm() dialogs with a beautiful custom UI
 */

// Global custom confirm function
window._physioConfirm = function(message, onOk, onCancel, opts) {
  var o = opts || {};
  var title = o.title || 'Confirm';
  var okText = o.okText || 'OK';
  var cancelText = o.cancelText || 'Cancel';
  var danger = o.danger !== false; // default true

  var ov = document.createElement('div');
  ov.id = '_confirmOv';
  ov.style.cssText = [
    'position:fixed;inset:0;z-index:99999',
    'background:rgba(0,0,0,.65)',
    'display:flex;align-items:center;justify-content:center',
    'padding:24px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
  ].join(';');

  ov.innerHTML =
    '<div style="background:#1a1f2e;border-radius:20px;width:100%;max-width:320px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.7);border:1px solid rgba(147,51,234,.2)">' +
      '<div style="padding:22px 22px 4px;display:flex;flex-direction:column;align-items:center;gap:10px">' +
        '<div style="width:52px;height:52px;border-radius:16px;background:' + (danger ? 'rgba(239,68,68,.15)' : 'rgba(147,51,234,.15)') + ';display:flex;align-items:center;justify-content:center">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="' + (danger ? '#ef4444' : '#a78bfa') + '" stroke-width="2" stroke-linecap="round">' +
            (danger ? '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' :
              '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>') +
          '</svg>' +
        '</div>' +
        '<p style="color:#f3e8ff;font-weight:800;font-size:16px;margin:0;text-align:center">' + title + '</p>' +
        '<p style="color:#9ca3af;font-size:14px;margin:0;text-align:center;line-height:1.55">' + (message||'') + '</p>' +
      '</div>' +
      '<div style="display:flex;gap:10px;padding:18px 22px 22px">' +
        '<button id="_confirmCancel" style="flex:1;background:rgba(255,255,255,.08);border:none;border-radius:14px;color:#e5e7eb;font-size:14px;font-weight:600;padding:13px;cursor:pointer;-webkit-tap-highlight-color:transparent">' + cancelText + '</button>' +
        '<button id="_confirmOk" style="flex:1;background:' + (danger ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#9333ea,#ec4899)') + ';border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:700;padding:13px;cursor:pointer;-webkit-tap-highlight-color:transparent">' + okText + '</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(ov);

  function close(ok) {
    ov.remove();
    if (ok && typeof onOk === 'function') onOk();
    else if (!ok && typeof onCancel === 'function') onCancel();
  }

  document.getElementById('_confirmOk').onclick = function() { close(true); };
  document.getElementById('_confirmCancel').onclick = function() { close(false); };
  ov.onclick = function(e) { if (e.target === ov) close(false); };
};

console.log('✅ Custom confirm modal loaded');
