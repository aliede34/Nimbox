let allUsers = [];

async function loadUsers() {
  try {
    const res = await fetch('/api/admin/users', getAuthHeaders());
    const data = await res.json();
    if (data.success) {
      allUsers = data.users;
      renderUsers(allUsers);
    }
  } catch (e) { console.error(e); }
}

function renderUsers(users) {
  const grid = document.getElementById('users-grid');
  if (!grid) return;
  if (!users || users.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>Henüz kullanıcı yok</p></div>';
    return;
  }
  grid.innerHTML = users.map(user => `
    <div class="file-card">
      <div class="file-icon">👤</div>
      <div class="file-name">${user.username || 'Bilinmeyen'}</div>
      <div class="file-meta">${user.email} · ${user.plan_id || 'free'}</div>
      <div class="file-actions">
        <button class="btn-download" onclick="toggleUser('${user.id}')">${user.is_active ? '🛑 Pasif' : '✅ Aktif'}</button>
      </div>
    </div>
  `).join('');
}

async function toggleUser(id) {
  try {
    const res = await fetch(`/api/admin/users/${id}/toggle`, { method: 'POST', headers: getAuthHeaders() });
    if (res.ok) { showToast('Durum değiştirildi'); loadUsers(); }
    else showToast('Hata', true);
  } catch (e) { showToast('Hata', true); }
}

document.addEventListener('DOMContentLoaded', () => { loadUsers(); });
