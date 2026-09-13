let allFiles = [];

async function loadFiles() {
  const res = await apiRequest('/api/files');
  if (res.success && res.data) {
    allFiles = res.data.files;
    renderFiles(allFiles);
    updateStats();
  }
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
      <div class="file-icon">${getFileIcon(f.original_name)}</div>
      <div class="file-name" title="${f.original_name}">${f.original_name}</div>
      <div class="file-meta">${formatSize(f.size)} · ${f.uploaded_at || ''}</div>
      <div class="file-actions">
        <button class="btn btn-download" onclick="downloadFile('${f.id}')">⬇️ İndir</button>
        <button class="btn btn-delete" onclick="deleteFile('${f.id}')">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}

async function downloadFile(id) {
  const res = await apiRequest(`/api/files/${id}/download`, 'GET');
  if (res.success) {
    window.open(`/api/files/${id}/download`, '_blank');
    showToast('İndirme başladı...');
  } else {
    showToast('İndirme hatası', true);
  }
}

async function deleteFile(id) {
  const file = allFiles.find(f => f.id === id);
  const name = file ? file.original_name : 'dosya';
  if (!confirm(`${name} silinecek. Emin misiniz?`)) return;
  const res = await apiRequest(`/api/files/${id}`, 'DELETE');
  if (res.success) { showToast('Dosya silindi'); loadFiles(); }
  else showToast('Silme hatası', true);
}

async function handleFiles(files) {
  if (!files || files.length === 0) return;
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const url = files.length > 1 ? '/api/upload-multiple' : '/api/upload';
  const res = await apiUpload(url, formData);
  if (res.success) {
    showToast(`${files.length} dosya başarıyla yüklendi!`);
    loadFiles();
  } else {
    showToast(res.error || 'Yükleme hatası', true);
  }
}

let searchTimer;
function handleSearch(e) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const q = e.target.value.trim();
    if (!q) { renderFiles(allFiles); return; }
    const res = await apiRequest('/api/search', 'POST', { q });
    if (res.success && res.data) renderFiles(res.data.files);
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
