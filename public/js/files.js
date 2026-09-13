let allFiles = [];
let currentPage = 1;
const pageSize = 20;
let totalPages = 1;

async function loadFiles(page = 1) {
  currentPage = page;
  try {
    const res = await apiRequest(`/api/files?page=${page}&limit=${pageSize}`);
    if (res.success && res.data) {
      allFiles = res.data.files;
      totalPages = res.data.pagination?.totalPages || 1;
      renderFiles(allFiles);
      renderPagination();
      updateStats();
    }
  } catch (e) { console.error(e); }
}

async function updateStats() {
  const res = await apiRequest('/api/stats');
  if (res.success && res.data) {
    const s = res.data.stats;
    const fc = document.getElementById('file-count');
    const ts = document.getElementById('total-size');
    if (fc) fc.textContent = s.totalFiles;
    if (ts) ts.textContent = s.totalSize;
  }
}

function renderFiles(files) {
  const grid = document.getElementById('file-grid');
  if (!grid) return;
  if (!files || files.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>Henüz dosya yok</p></div>';
    return;
  }
  grid.innerHTML = files.map(f => `
    <div class="file-card">
      <input type="checkbox" data-file-id="${f.id}" style="position:absolute;top:8px;right:8px;z-index:2;width:18px;height:18px;cursor:pointer">
      <div class="file-icon">${getFileIcon(f.original_name)}</div>
      <div class="file-name" title="${f.original_name}">${f.original_name}</div>
      <div class="file-meta">${formatSize(f.size)} · ${f.uploaded_at || ''} · ⬇️ ${f.downloads || 0}</div>
      <div class="file-actions">
        <button class="btn btn-download" onclick="downloadFile('${f.id}')">⬇️ İndir</button>
        <button class="btn btn-preview" onclick="previewFile('${f.id}')">👁️ Önizle</button>
        <button class="btn btn-share" onclick="shareFile('${f.id}')">🔗 Paylaş</button>
        <button class="btn btn-delete" onclick="deleteFile('${f.id}')">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}

function renderPagination() {
  let container = document.getElementById('pagination-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'pagination-container';
    container.className = 'pagination';
    const grid = document.getElementById('file-grid');
    if (grid && grid.parentElement) grid.parentElement.appendChild(container);
  }
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="loadFiles(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

async function downloadFile(id) {
  window.open(`/api/files/${id}/download`, '_blank');
  showToast('İndirme başladı...');
}

async function shareFile(id) {
  const password = prompt('Özel şifre (boş bırakın - şifresiz):');
  const expiresIn = prompt('Süre (saniye, örn: 86400 = 1 gün):') || '0';
  const maxDl = prompt('Maksimum indirme sayısı (0 = limitsiz):') || '0';
  try {
    const body = {};
    if (password) body.password = password;
    if (expiresIn && parseInt(expiresIn) > 0) body.expires_in = parseInt(expiresIn);
    if (maxDl && parseInt(maxDl) > 0) body.max_downloads = parseInt(maxDl);
    const res = await apiRequest(`/api/files/${id}/share`, 'POST', body);
    if (res.success && res.data?.share_url) {
      const url = res.data.share_url;
      if (confirm('Paylaşım linki:\n\n' + url + '\n\nKopyalamak için Tamam deşin.')) {
        navigator.clipboard?.writeText(url);
        showToast('Link kopyalandı!');
      }
    } else if (res.success && !res.data?.share_url) {
      showToast('Share failed: no URL returned');
    } else {
      showToast('Paylaşım hatası', true);
    }
  } catch (e) { showToast('Hata', true); }
}

async function previewFile(id) {
  try {
    const res = await apiRequest(`/api/files/${id}/preview`);
    if (res.success && res.data?.preview) {
      const p = res.data.preview;
      if (p.type === 'image') {
        const img = document.createElement('img');
        img.src = `/uploads/${allFiles.find(f => f.id === id)?.path}`;
        img.style.cssText = 'max-width:90vw;max-height:80vh;border-radius:12px';
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999';
        modal.onclick = () => modal.remove();
        modal.appendChild(img);
        document.body.appendChild(modal);
      } else if (p.type === 'text') {
        const res2 = await apiRequest(`/api/files/${id}/content`);
        if (res2.success && res2.data?.content) {
          const pre = document.createElement('pre');
          pre.style.cssText = 'max-width:90vw;max-height:80vh;overflow:auto;background:#1e293b;color:#e2e8f0;padding:20px;border-radius:12px;font-size:13px';
          pre.textContent = res2.data.content;
          const modal = document.createElement('div');
          modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999';
          modal.onclick = () => modal.remove();
          modal.appendChild(pre);
          document.body.appendChild(modal);
        }
      } else {
        alert('Önizleme yok: ' + p.original_name);
      }
    }
  } catch (e) { showToast('Önizleme açılamadı', true); }
}

async function deleteFile(id) {
  const file = allFiles.find(f => f.id === id);
  const name = file ? file.original_name : 'dosya';
  if (!confirm(`${name} silinecek. Emin misiniz?`)) return;
  const res = await apiRequest(`/api/files/${id}`, 'DELETE');
  if (res.success) { showToast('Dosya silindi'); loadFiles(currentPage); }
  else showToast('Silme hatası', true);
}

async function downloadZip() {
  const checked = document.querySelectorAll('input[data-file-id]:checked');
  if (checked.length === 0) { showToast('En az bir dosya seçin', true); return; }
  const ids = Array.from(checked).map(c => c.dataset.fileId);
  try {
    const res = await apiRequest('/api/files/zip', 'POST', { file_ids: ids });
    if (res.success) {
      const filename = `nimbox-${Date.now()}.zip`;
      const a = document.createElement('a');
      a.href = `/uploads/${filename}`;
      a.download = filename;
      a.click();
      showToast('ZIP indirme başladı...');
    } else {
      showToast('ZIP hatası', true);
    }
  } catch (e) { showToast('Hata', true); }
}

let searchTimer;
function handleSearch(e) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = e.target.value.trim();
    if (!q) { loadFiles(currentPage); return; }
    const res = await apiRequest('/api/search', 'POST', { q });
    if (res.success && res.data) { allFiles = res.data.files; totalPages = 1; renderFiles(allFiles); }
  }, 300);
}

function handleDragOver(e) { e.preventDefault(); const el = document.getElementById('upload-section'); if (el) el.classList.add('drag-over'); }
function handleDragLeave() { const el = document.getElementById('upload-section'); if (el) el.classList.remove('drag-over'); }
function handleDrop(e) {
  e.preventDefault();
  const el = document.getElementById('upload-section');
  if (el) el.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
}

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const uploadSection = document.getElementById('upload-section');
  if (fileInput) fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
  if (uploadSection) uploadSection.addEventListener('click', () => { if (fileInput) fileInput.click(); });
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', handleSearch);
  loadFiles();
});
