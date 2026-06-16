// Physio SUAI - Main JavaScript
// Comprehensive utilities and app functionality

// ============================================================================
// GLOBAL STATE MANAGEMENT
// ============================================================================

const AppState = {
  currentPage: 'home',
  selectedFiles: [],
  friendRequests: [],
  friends: [],
  notifications: [],
  darkMode: true,
  currentChat: null
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showLoading(message = "Loading...") {
  const loading = document.getElementById('loadingOverlay');
  if (loading) {
    loading.querySelector('.loading-text').textContent = message;
    loading.classList.remove('hidden');
  }
}

function hideLoading() {
  const loading = document.getElementById('loadingOverlay');
  if (loading) loading.classList.add('hidden');
}

// ── Quiet nav-pill: small pill at bottom of the button that triggered loading ──
// Use instead of the big overlay for background refreshes (lectures, assignments)
function showNavPill(label, anchorBtnId) {
  var ex = document.getElementById('_navPill'); if (ex) { ex.querySelector('._npTxt').textContent = label || 'Loading…'; return; }
  var d = document.createElement('div'); d.id = '_navPill';
  // Position near the bottom nav button if anchorBtnId provided, else bottom-center
  d.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:9980;background:rgba(15,20,30,.88);border-radius:20px;padding:6px 14px 6px 10px;display:flex;align-items:center;gap:8px;box-shadow:0 3px 16px rgba(0,0,0,.55);pointer-events:none;backdrop-filter:blur(8px)';
  d.innerHTML = '<div style="width:16px;height:16px;border:2px solid #9333ea;border-top-color:#ec4899;border-radius:50%;animation:spin 0.9s linear infinite;flex-shrink:0"></div><span class="_npTxt" style="color:#e9edef;font-size:12px;font-weight:600;white-space:nowrap">' + (label || 'Loading…') + '</span>';
  document.body.appendChild(d);
}
function hideNavPill() { var d = document.getElementById('_navPill'); if (d) d.remove(); }

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-[9999] px-6 py-4 rounded-lg shadow-2xl transform transition-all duration-500 ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  }`;
  toast.innerHTML = `
    <div class="flex items-center space-x-3 text-white">
      <span class="text-2xl">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
      <span class="font-medium">${message}</span>
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function showModal(title, content, buttons = []) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-2xl max-w-md w-full mx-4 p-6 border border-gray-700 transform transition-all scale-95 animate-scale-in">
      <h3 class="text-2xl font-bold mb-4">${title}</h3>
      <div class="mb-6">${content}</div>
      <div class="flex space-x-3">
        ${buttons.map(btn => `
          <button onclick="${btn.onClick}" class="flex-1 px-4 py-3 rounded-lg font-medium transition ${btn.class || 'bg-gray-700 hover:bg-gray-600'}">
            ${btn.text}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  return modal;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============================================================================
// FILE HANDLING
// ============================================================================

async function handleFileSelect(acceptType = '*/*', multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptType;
    input.multiple = multiple;
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      const processedFiles = [];
      
      for (const file of files) {
        const reader = new FileReader();
        const fileData = await new Promise((resolve) => {
          reader.onload = (e) => {
            resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              data: e.target.result,
              file: file
            });
          };
          
          if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
          } else {
            reader.readAsDataURL(file);
          }
        });
        processedFiles.push(fileData);
      }
      
      resolve(multiple ? processedFiles : processedFiles[0]);
    };
    
    input.click();
  });
}

async function compressImage(file, maxWidth = 1200) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// CAMERA FUNCTIONALITY
// ============================================================================

async function openCamera() {
  return new Promise(async (resolve) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] bg-black flex flex-col';
    modal.innerHTML = `
      <div class="flex items-center justify-between p-4 bg-gray-900">
        <button onclick="this.closest('.fixed').remove()" class="text-white text-xl">✕</button>
        <h3 class="text-white font-bold">Take Photo</h3>
        <button id="captureBtn" class="bg-pink-500 px-4 py-2 rounded-lg text-white">Capture</button>
      </div>
      <video id="cameraStream" class="flex-1 w-full object-cover" autoplay playsinline></video>
      <canvas id="cameraCanvas" class="hidden"></canvas>
    `;
    document.body.appendChild(modal);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      
      const video = modal.querySelector('#cameraStream');
      video.srcObject = stream;
      
      modal.querySelector('#captureBtn').onclick = () => {
        const canvas = modal.querySelector('#cameraCanvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          stream.getTracks().forEach(track => track.stop());
          modal.remove();
          resolve(new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      };
    } catch (error) {
      console.error('Camera error:', error);
      modal.remove();
      showToast('Camera access denied', 'error');
      resolve(null);
    }
  });
}

// ============================================================================
// IMAGE/PDF VIEWER
// ============================================================================

function viewFile(url, type, name, id, collection) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-2';

  const isPDF = type === 'application/pdf' || url.toLowerCase().endsWith('.pdf');
  const isImage = type && type.startsWith('image/');

  // PDF viewer: try inline first, fall back to Google Docs viewer
  let content = '';
  if (isPDF) {
    content = `
      <div style="width:100%;height:82vh;display:flex;flex-direction:column;gap:0">
        <iframe id="_pdfFrame" src="${url}" style="flex:1;width:100%;border:none;border-radius:8px 8px 0 0;background:#fff"></iframe>
        <div style="background:#1f2937;padding:8px 12px;border-radius:0 0 8px 8px;display:flex;gap:8px;align-items:center">
          <span style="color:#9ca3af;font-size:12px;flex:1">If PDF is blank, tap "Open in browser"</span>
          <button onclick="document.getElementById('_pdfFrame').src='https://docs.google.com/viewer?url='+encodeURIComponent('${url}')+'&embedded=true'" 
            style="background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:600">📄 Google View</button>
          <a href="${url}" target="_blank" style="background:#7c3aed;color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;text-decoration:none">↗ Browser</a>
        </div>
      </div>`;
  } else if (isImage) {
    content = `<img src="${url}" style="max-width:100%;max-height:82vh;object-fit:contain;border-radius:8px" alt="${name}">`;
  } else {
    content = `<div style="background:#1f2937;padding:32px;border-radius:12px;text-align:center"><p style="color:#fff;font-size:16px;margin-bottom:12px">📎 ${name}</p><p style="color:#9ca3af;font-size:13px">Preview not available</p></div>`;
  }

  const canDelete = id && collection && currentUser && (
    collection === 'novels' || collection === 'assignments'
  );

  modal.innerHTML = `
    <div style="position:relative;max-width:900px;width:100%">
      <div style="background:#111827;border-radius:12px;padding:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <button onclick="this.closest('.fixed').remove()" style="width:36px;height:36px;background:#374151;border:none;border-radius:50%;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0">✕</button>
          <h3 style="color:#fff;font-weight:700;font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</h3>
          ${canDelete ? `<button onclick="_deleteUpload('${id}','${collection}',this)" style="background:#ef4444;color:#fff;border:none;border-radius:10px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer">🗑 Delete</button>` : ''}
        </div>
        ${content}
        <button onclick="_instantDownload('${url}','${name}')" style="width:100%;margin-top:10px;background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
      </div>
    </div>`;

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// Instant download without opening browser
function _instantDownload(url, filename) {
  showToast('Downloading...');
  fetch(url)
    .then(function(r){ return r.blob(); })
    .then(function(blob){
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename || 'file';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 1000);
      showToast('Downloaded!');
    })
    .catch(function(){
      // Fallback: open in new tab
      var a = document.createElement('a');
      a.href = url; a.download = filename || 'file'; a.target = '_blank';
      document.body.appendChild(a); a.click();
      setTimeout(function(){ document.body.removeChild(a); }, 500);
    });
}

// Delete uploaded file (only by owner)
function _deleteUpload(id, collection, btnEl) {
  _physioConfirm('This cannot be undone.', function() {
    _doDeleteUpload(id, collection, btnEl);
  }, null, {title:'Delete file?', okText:'Delete', danger:true});
}
function _doDeleteUpload(id, collection, btnEl) {
  db.ref(collection + '/' + id).remove().then(function(){
    showToast('Deleted!');
    var modal = btnEl.closest('.fixed'); if(modal) modal.remove();
    // Refresh the grid
    var grid = document.getElementById(collection === 'novels' ? 'novelsGrid' : 'assignmentsGrid');
    if (grid) { if(collection==='novels') loadNovels(grid); else loadAssignments(grid); }
  }).catch(function(){ showToast('Delete failed','error'); });
}

// ============================================================================
// EMOJI/STICKER PICKER
// ============================================================================

function showEmojiPicker(callback) {
  const emojis = ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'];
  
  const stickers = ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','💪','🙏','✍️','💅','🦵','🦶','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  
  const modal = document.createElement('div');
  modal.className = 'fixed bottom-20 right-4 z-[9999] bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-80 max-h-96 overflow-y-auto';
  modal.innerHTML = `
    <div class="sticky top-0 bg-gray-800 border-b border-gray-700 p-3">
      <div class="flex space-x-2">
        <button onclick="this.parentElement.parentElement.nextElementSibling.innerHTML = this.dataset.emojis" data-emojis="${emojis.map(e => `<button onclick="(${callback})('${e}'); this.closest('.fixed').remove()" class='text-3xl hover:scale-125 transition p-2'>${e}</button>`).join('')}" class="flex-1 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">😀 Emojis</button>
        <button onclick="this.parentElement.parentElement.nextElementSibling.innerHTML = this.dataset.stickers" data-stickers="${stickers.map(s => `<button onclick="(${callback})('${s}'); this.closest('.fixed').remove()" class='text-3xl hover:scale-125 transition p-2'>${s}</button>`).join('')}" class="flex-1 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">👍 Stickers</button>
      </div>
    </div>
    <div class="p-4 grid grid-cols-6 gap-2">
      ${emojis.map(emoji => `<button onclick="(${callback})('${emoji}'); this.closest('.fixed').remove()" class='text-3xl hover:scale-125 transition p-2'>${emoji}</button>`).join('')}
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.remove(), 30000);
}

// ============================================================================
// ASSIGNMENT FUNCTIONS
// ============================================================================

async function submitAssignment(name, description, file = null) {
  showNavPill("Submitting assignment…");
  
  let fileUrl = null;
  if (file) {
    const upload = await uploadFile(file, 'assignments');
    if (upload.success) fileUrl = upload.url;
  }
  
  const result = await saveToFirebase('assignments', {
    name,
    description,
    fileUrl,
    fileType: file ? file.type : null,
    author: currentUser ? currentUser.email : 'Anonymous',
    authorId: currentUser ? currentUser.uid : 'anon',
    timestamp: Date.now(),
    views: 0,
    downloads: 0,
    helpful: 0
  });
  
  hideNavPill();
  
  if (result.success) {
    showToast('Assignment submitted successfully!');
    return true;
  } else {
    showToast('Failed to submit assignment', 'error');
    return false;
  }
}

async function loadAssignments(container) {
  showNavPill("Loading assignments…");
  const assignments = await getFromFirebase('assignments', 100);
  hideNavPill();

  if (!container) return assignments;

  container.innerHTML = assignments.length === 0
    ? '<div class="col-span-full text-center py-12 text-gray-400">No assignments yet. Be the first to add one!</div>'
    : assignments.map(assignment => {
        const isOwner = currentUser && (currentUser.uid === assignment.authorId);
        const isPDF = assignment.fileType === 'application/pdf' || (assignment.fileUrl||'').endsWith('.pdf');
        const isImage = assignment.fileType && assignment.fileType.startsWith('image/');

        // Preview thumbnail area
        const previewHtml = isImage
          ? `<div style="height:140px;background:#111827;border-radius:12px 12px 0 0;overflow:hidden;position:relative">
               <img src="${assignment.fileUrl}" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'">
               <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.6);border-radius:6px;padding:2px 8px;color:#fff;font-size:11px;font-weight:600">IMG</div>
             </div>`
          : isPDF
          ? `<div style="height:140px;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px 12px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;gap:8px">
               <svg width="48" height="60" viewBox="0 0 48 60" fill="none"><rect x="4" y="0" width="32" height="60" rx="4" fill="#ef4444" opacity="0.9"/><path d="M36 0 L44 8 L36 8 Z" fill="#b91c1c"/><rect x="36" y="0" width="8" height="8" rx="1" fill="#b91c1c"/><text x="8" y="40" font-size="9" fill="white" font-weight="bold" font-family="sans-serif">PDF</text></svg>
               <span style="color:rgba(255,255,255,.7);font-size:11px;font-weight:600;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${assignment.name}</span>
               <div style="position:absolute;top:8px;right:8px;background:rgba(239,68,68,.9);border-radius:6px;padding:2px 8px;color:#fff;font-size:11px;font-weight:700">PDF</div>
             </div>`
          : `<div style="height:140px;background:linear-gradient(135deg,#1f2937,#374151);border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:center">
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
             </div>`;

        return `
      <div style="background:#1f2937;border-radius:14px;overflow:hidden;border:1px solid #374151;transition:border-color .2s;cursor:pointer" 
           onmouseover="this.style.borderColor='#ec4899'" onmouseout="this.style.borderColor='#374151'"
           onclick="viewAssignmentById('${JSON.stringify(assignment).replace(/'/g,"&#39;").replace(/"/g,'&quot;')}')"
           data-id="${assignment.id}">
        ${previewHtml}
        <div style="padding:12px 14px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
            <h3 style="color:#f9fafb;font-weight:700;font-size:14px;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${assignment.name}</h3>
            ${isOwner ? `<button onclick="event.stopPropagation();_deleteUpload('${assignment.id}','assignments',this)" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0">🗑 Del</button>` : ''}
          </div>
          <p style="color:#9ca3af;font-size:12px;margin:0 0 8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${assignment.description}</p>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#6b7280">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">By ${assignment.author}</span>
            <div style="display:flex;gap:8px;flex-shrink:0">
              <span>👁 ${assignment.views || 0}</span>
              <span>⬇ ${assignment.downloads || 0}</span>
            </div>
          </div>
        </div>
      </div>`;
      }).join('');

  return assignments;
}

function viewAssignment(assignment) {
  if (assignment.fileUrl) {
    viewFile(assignment.fileUrl, assignment.fileType, assignment.name, assignment.id, 'assignments');
    db.ref(`assignments/${assignment.id}/views`).transaction((views) => (views || 0) + 1);
  } else {
    showModal(assignment.name, `<p class="text-gray-300">${assignment.description}</p>`, [
      { text: 'Close', onClick: 'this.closest(".fixed").remove()' }
    ]);
  }
}

function viewAssignmentById(jsonString) {
  try {
    const assignment = JSON.parse(jsonString);
    viewAssignment(assignment);
  } catch (e) {
    console.error('Error parsing assignment:', e);
    showToast('Error loading assignment', 'error');
  }
}

// ============================================================================
// NOVEL FUNCTIONS
// ============================================================================

async function submitNovel(file) {
  if (!file || (file.type !== 'application/pdf' && !file.type.startsWith('image/'))) {
    showToast('Please select a PDF or image file', 'error');
    return false;
  }
  
  showLoading("Uploading novel...");
  const upload = await uploadFile(file, 'novels');
  
  if (upload.success) {
    const result = await saveToFirebase('novels', {
      name: file.name,
      fileUrl: upload.url,
      fileType: file.type,
      author: currentUser ? currentUser.email : 'Anonymous',
      authorId: currentUser ? currentUser.uid : 'anon',
      timestamp: Date.now(),
      views: 0,
      downloads: 0,
      ratings: []
    });
    
    hideLoading();
    
    if (result.success) {
      showToast('Novel uploaded successfully!');
      return true;
    }
  }
  
  hideLoading();
  showToast('Failed to upload novel', 'error');
  return false;
}

async function loadNovels(container) {
  showLoading("Loading novels...");
  const novels = await getFromFirebase('novels', 100);
  hideLoading();

  if (!container) return novels;

  container.innerHTML = novels.length === 0
    ? '<div class="col-span-full text-center py-12 text-gray-400">No novels yet. Be the first to share one!</div>'
    : novels.map(novel => {
        const isOwner = currentUser && (currentUser.uid === novel.authorId);
        return `
      <div class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-pink-500 transition">
        <div class="h-48 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer" onclick='viewFile("${novel.fileUrl}","${novel.fileType}","${novel.name}","${novel.id}","novels")'>
          <span class="text-6xl">📚</span>
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between mb-1">
            <h3 class="font-bold truncate flex-1 cursor-pointer" onclick='viewFile("${novel.fileUrl}","${novel.fileType}","${novel.name}","${novel.id}","novels")'>${novel.name}</h3>
            ${isOwner ? `<button onclick="_deleteUpload('${novel.id}','novels',this)" class="text-red-400 text-sm ml-2 flex-shrink-0 hover:text-red-300">🗑</button>` : ''}
          </div>
          <p class="text-gray-400 text-sm mb-3">By ${novel.author}</p>
          <div class="flex items-center justify-between text-sm text-gray-400">
            <span>${formatTimestamp(novel.timestamp)}</span>
            <div class="flex space-x-3">
              <span>👁 ${novel.views || 0}</span>
              <span>⬇ ${novel.downloads || 0}</span>
            </div>
          </div>
        </div>
      </div>`;
      }).join('');

  return novels;
}

// ============================================================================
// BUY BOOK FUNCTIONS
// ============================================================================

async function submitBook(name, amount, account, phone, image, password) {
  if (password !== '0987654321') {
    showToast('Incorrect password', 'error');
    return false;
  }
  
  showLoading("Listing book for sale...");
  
  let imageUrl = null;
  if (image) {
    const upload = await uploadFile(image, 'books');
    if (upload.success) imageUrl = upload.url;
  }
  
  const result = await saveToFirebase('books', {
    name,
    amount,
    account,
    phone,
    imageUrl,
    sellerId: currentUser ? currentUser.uid : 'anon',
    sellerName: currentUser ? currentUser.email : 'Anonymous',
    timestamp: Date.now(),
    sold: false,
    buyers: []
  });
  
  hideLoading();
  
  if (result.success) {
    showToast('Book listed successfully!');
    return true;
  } else {
    showToast('Failed to list book', 'error');
    return false;
  }
}

async function loadBooks(container) {
  showLoading("Loading books...");
  const books = await getFromFirebase('books', 100);
  hideLoading();
  
  if (!container) return books;
  
  container.innerHTML = books.length === 0
    ? '<div class="col-span-full text-center py-12 text-gray-400">No books for sale yet.</div>'
    : books.map(book => `
      <div class="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-green-500 transition">
        ${book.imageUrl ? `<img src="${book.imageUrl}" class="w-full h-48 object-cover" alt="${book.name}">` : `<div class="w-full h-48 bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-6xl">📖</div>`}
        <div class="p-4">
          <h3 class="font-bold text-lg mb-2">${book.name}</h3>
          <p class="text-green-400 text-2xl font-bold mb-3">₦${book.amount}</p>
          <p class="text-gray-400 text-sm mb-3">Seller: ${book.sellerName}</p>
          <button onclick='buyBookById(this.dataset.book)' data-book='${JSON.stringify(book)}' class="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg transition">
            🛒 Buy Now
          </button>
        </div>
      </div>
    `).join('');
  
  return books;
}

async function buyBook(book) {
  const modal = showModal('Purchase Book', `
    <div class="space-y-4">
      <p class="text-gray-300">Book: <strong>${book.name}</strong></p>
      <p class="text-gray-300">Price: <strong class="text-green-400">₦${book.amount}</strong></p>
      <p class="text-gray-300">Seller Phone: <strong>${book.phone}</strong></p>
      <p class="text-gray-300">Account: <strong>${book.account}</strong></p>
      <div class="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mt-4">
        <p class="text-yellow-200 text-sm">📤 Upload payment proof (image or PDF)</p>
      </div>
    </div>
  `, [
    { text: 'Cancel', onClick: 'this.closest(".fixed").remove()' },
    { 
      text: 'Upload Proof', 
      onClick: `uploadPaymentProof('${book.id}', '${book.sellerId}')`,
      class: 'bg-green-500 hover:bg-green-600'
    }
  ]);
}

function buyBookById(jsonString) {
  try {
    const book = JSON.parse(jsonString);
    buyBook(book);
  } catch (e) {
    console.error('Error parsing book:', e);
    showToast('Error loading book', 'error');
  }
}

async function uploadPaymentProof(bookId, sellerId) {
  const file = await handleFileSelect('image/*,.pdf');
  if (!file) return;
  
  showLoading("Verifying payment...");
  const upload = await uploadFile(file.file, 'payments');
  
  if (upload.success) {
    await saveToFirebase(`books/${bookId}/buyers`, {
      buyerId: currentUser ? currentUser.uid : 'anon',
      buyerName: currentUser ? currentUser.email : 'Anonymous',
      proofUrl: upload.url,
      timestamp: Date.now(),
      verified: false
    });
    
    sendNotification(sellerId, `New purchase request for your book!`);
    hideLoading();
    showToast('Payment proof uploaded! Seller will be notified.');
    document.querySelector('.fixed')?.remove();
  } else {
    hideLoading();
    showToast('Failed to upload proof', 'error');
  }
}

// I'll continue with more functions in the next part...
console.log("✅ Main utilities loaded!");
