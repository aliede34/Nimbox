let _discountRate = 20;
let modalPlansData = [];

function openPlansModal() {
  const modal = document.getElementById('plans-modal');
  const body = document.getElementById('modal-body');
  if (!modal || !body) return;
  body.innerHTML = '<div class="loading"><div class="spinner"></div><p>Planlar yükleniyor...</p></div>';
  modal.style.display = 'flex';

  fetch('/api/plans')
    .then(r => r.json())
    .then(data => {
      if (!data.success) { body.innerHTML = '<p>Planlar yüklenemedi.</p>'; return; }
      _discountRate = data.discountRate || 20;
      modalPlansData = data.plans;
      renderModalPlans(data.plans);
    })
    .catch(() => { body.innerHTML = '<p>Bağlantı hatası.</p>'; });
}

function closePlansModal() {
  const modal = document.getElementById('plans-modal');
  if (modal) modal.style.display = 'none';
}

function renderModalPlans(plans) {
  const body = document.getElementById('modal-body');
  if (!body) return;
  body.innerHTML = `
    <div class="toggle-section">
      <button class="toggle-btn active" id="modal-monthly" onclick="toggleModalPricing('monthly')">Aylık</button>
      <button class="toggle-btn" id="modal-yearly" onclick="toggleModalPricing('yearly')">Yıllık <span class="toggle-badge">-%${_discountRate}</span></button>
    </div>
    <div class="pricing-grid" id="modal-pricing-grid"></div>
  `;
  renderModalPlansList(plans, 'monthly');
}

let currentModalPricing = 'monthly';

function toggleModalPricing(type) {
  currentModalPricing = type;
  const mb = document.getElementById('modal-monthly');
  const yb = document.getElementById('modal-yearly');
  if (mb) mb.classList.toggle('active', type === 'monthly');
  if (yb) yb.classList.toggle('active', type === 'yearly');
  renderModalPlansList(modalPlansData, type);
}

function renderModalPlansList(plans, type) {
  const grid = document.getElementById('modal-pricing-grid');
  if (!grid) return;
  grid.innerHTML = plans.map(plan => {
    const price = type === 'monthly' ? plan.price : plan.yearlyPrice;
    const monthlyPrice = plan.price;
    const isFree = plan.price === 0;
    const showDiscount = type === 'yearly' && !isFree;
    const discountPct = plan.discount || 0;
    return `
      <div class="pricing-card ${plan.popular ? 'popular' : ''}">
        <div class="plan-name">${plan.name}</div>
        <div class="plan-price">${isFree ? 'Ücretsiz' : '₺' + price.toFixed(2)}</div>
        ${showDiscount ? `<div class="plan-price-original">₺${monthlyPrice.toFixed(2)}/ay</div><div class="plan-discount-badge">-%${discountPct}</div>` : `<div class="plan-period">${isFree ? '' : type === 'monthly' ? '/ay' : '/yıl'}</div>`}
        <div class="plan-storage">${plan.storage}</div>
        <hr class="divider">
        <ul class="feature-list">
          ${plan.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <button class="btn-select ${isFree ? 'free' : 'paid'}" ${isFree ? 'disabled' : ''} onclick="selectPlan('${plan.id}'); closePlansModal();">
          ${isFree ? 'Başlat' : 'Seç'}
        </button>
      </div>
    `;
  }).join('');
}

function selectPlan(planId) {
  showToast('Plan seçildi! Ödeme sayfasına yönlendiriliyor...');
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  updateAuthNav();
  const modal = document.getElementById('plans-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePlansModal();
    });
  }
});

function updateAuthNav() {
  const authNav = document.getElementById('auth-nav');
  const userNav = document.getElementById('user-nav');
  const navUsername = document.getElementById('nav-username');
  if (!authNav || !userNav) return;

  const user = getUser();
  if (user) {
    authNav.style.display = 'none';
    userNav.style.display = 'flex';
    if (navUsername) navUsername.textContent = user.username || user.email || 'Kullanıcı';
  } else {
    authNav.style.display = 'flex';
    userNav.style.display = 'none';
  }
}

function logout() {
  clearToken();
  showToast('Çıkış yapıldı');
  updateAuthNav();
  setTimeout(() => { window.location.href = '/login'; }, 500);
}
