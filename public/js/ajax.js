const API_BASE = '';

async function apiRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  try {
    const res = await fetch(url, options);
    const data = await res.json();
    return { success: data.success, data: data, status: res.status };
  } catch (err) {
    return { success: false, data: { error: err.message }, status: 500 };
  }
}

async function apiUpload(url, formData) {
  try {
    const res = await fetch(url, { method: 'POST', body: formData });
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = { pdf: '📄', doc: '📝', xls: '📊', csv: '📊', txt: '📃', zip: '🗜️', rar: '🗜️', mp3: '🎵', mp4: '🎬', avi: '🎬', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🎨', iso: '💿', exe: '⚙️', js: '📜', html: '🌐', css: '🎨', py: '🐍', java: '☕', cpp: '⚙️', json: '📋', md: '📝' };
  return icons[ext] || '📁';
}

function showToast(msg, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast show' + (isError ? ' error' : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function setActiveNav(page) {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });
}

function initNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => setActiveNav(link.dataset.page));
  });
}
