const TOKEN_KEY = 'nimbox_admin_token';

function getAdminToken() { return localStorage.getItem(TOKEN_KEY); }
function setAdminToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearAdminToken() { localStorage.removeItem(TOKEN_KEY); }
function getAuthHeaders() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAdminToken()}` }; }

function showToast(msg, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast show' + (isError ? ' error' : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const secret = document.getElementById('admin-secret').value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (!secret) return;
  btn.disabled = true;
  btn.textContent = 'Giriliyor...';
  document.getElementById('admin-login-error').style.display = 'none';

  try {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) });
    const data = await res.json();
    if (data.success) {
      setAdminToken(data.token);
      document.getElementById('admin-login-section').style.display = 'none';
      document.getElementById('admin-dashboard').style.display = 'block';
      loadAdminStats();
      showToast('Admin paneline hoş geldiniz!');
    } else {
      document.getElementById('admin-login-error').textContent = data.error;
      document.getElementById('admin-login-error').style.display = 'block';
    }
  } catch (err) {
    document.getElementById('admin-login-error').textContent = 'Bağlantı hatası';
    document.getElementById('admin-login-error').style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Giriş Yap';
  }
}

async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', getAuthHeaders());
    const data = await res.json();
    if (data.success) {
      const s = data.stats;
      document.getElementById('stat-users').textContent = s.totalUsers;
      document.getElementById('stat-active').textContent = s.activeUsers;
      document.getElementById('stat-files').textContent = s.totalFiles;
      document.getElementById('stat-size').textContent = s.totalSize;
    }
  } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-login-form');
  if (form) form.addEventListener('submit', handleAdminLogin);
  if (getAdminToken()) {
    document.getElementById('admin-login-section').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadAdminStats();
  }
});
