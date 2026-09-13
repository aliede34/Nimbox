const TOKEN_KEY = 'nimbox_token';
const USER_KEY = 'nimbox_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getUser() {
  return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
}

function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function isLoggedIn() {
  return !!getToken() && !!getUser();
}

function getAuthHeaders() {
  const token = getToken();
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

function showAuthError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function hideAuthError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button[type="submit"]');
  if (!email || !password) return;

  btn.disabled = true;
  btn.textContent = 'Giriliyor...';
  hideAuthError('login-error');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      showToast('Giriş başarılı!');
      setTimeout(() => { window.location.href = '/'; }, 800);
    } else {
      showAuthError('login-error', data.error || 'Giriş başarısız');
    }
  } catch (err) {
    showAuthError('login-error', 'Bağlantı hatası');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Giriş Yap';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const btn = e.target.querySelector('button[type="submit"]');

  if (!username || !email || !password || !confirm) return;
  if (password !== confirm) {
    showAuthError('register-error', 'Şifreler uyuşmuyor');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Kaydediliyor...';
  hideAuthError('register-error');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password })
    });
    const data = await res.json();

    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      showToast('Kayıt başarılı! Hoş geldiniz!');
      setTimeout(() => { window.location.href = '/'; }, 800);
    } else {
      showAuthError('register-error', data.error || 'Kayıt başarısız');
    }
  } catch (err) {
    showAuthError('register-error', 'Bağlantı hatası');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kayıt Ol';
  }
}

function checkAuth() {
  if (!isLoggedIn()) {
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  }
}

function logout() {
  clearToken();
  showToast('Çıkış yapıldı');
  window.location.href = '/login';
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});
