let allPlans = [];

async function loadPlans() {
  const res = await apiRequest('/api/plans');
  if (res.success && res.data) {
    allPlans = res.data.plans;
    renderPlans(allPlans, 'monthly');
    renderFeatureGrid();
  }
}

function togglePricing(type) {
  const mb = document.getElementById('monthly-btn');
  const yb = document.getElementById('yearly-btn');
  if (mb) mb.classList.toggle('active', type === 'monthly');
  if (yb) yb.classList.toggle('active', type === 'yearly');
  renderPlans(allPlans, type);
}

function renderPlans(plans, type) {
  const grid = document.getElementById('pricing-grid');
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
        <button class="btn-select ${isFree ? 'free' : 'paid'}" ${isFree ? 'disabled' : ''} onclick="selectPlan('${plan.id}')">
          ${isFree ? 'Başlat' : 'Seç'}
        </button>
      </div>
    `;
  }).join('');
}

function selectPlan(planId) {
  const plan = allPlans.find(p => p.id === planId);
  if (plan && plan.price > 0) {
    showToast(`${plan.name} planı seçildi! Ödeme sayfasına yönlendiriliyor...`);
  } else if (plan) {
    showToast('Ücretsiz plan başlatıldı!');
  }
}

function renderFeatureGrid() {
  const grid = document.getElementById('feature-grid');
  if (!grid) return;
  const features = [
    { icon: '🔒', title: 'SSL Şifreleme', desc: 'Tüm dosyalar end-to-end şifrelenir' },
    { icon: '🌍', title: 'Global Sunucular', desc: 'Türkiye ve Avrupa sunucuları' },
    { icon: '⚡', title: 'Hızlı Yükleme', desc: 'CDN destekli hız optimize' },
    { icon: '📱', title: 'Mobil Uygulama', desc: 'iOS ve Android uygulamaları' },
    { icon: '🔐', title: '2FA Güvenlik', desc: 'İki aşamalı doğrulama' },
    { icon: '🤝', title: '7/24 Destek', desc: 'Türkçe canlı destek hattı' },
    { icon: '📊', title: 'Aktivite Raporu', desc: 'Detaylı kullanım istatistikleri' },
    { icon: '🔗', title: 'Paylaşım Linki', desc: 'Kolay paylaşım ve işbirliği' }
  ];
  grid.innerHTML = features.map(f => `
    <div class="feature-card">
      <div class="feature-icon">${f.icon}</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => { loadPlans(); });
