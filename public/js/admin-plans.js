let allPlans = [];

async function loadPlans() {
  try {
    const res = await fetch('/api/admin/plans', getAuthHeaders());
    const data = await res.json();
    if (data.success) {
      allPlans = data.plans;
      renderPlans(allPlans);
    }
  } catch (e) { console.error(e); }
}

function renderPlans(plans) {
  const grid = document.getElementById('plans-grid');
  if (!grid) return;
  grid.innerHTML = plans.map(plan => `
    <div class="pricing-card">
      <div class="plan-name">${plan.name}</div>
      <div class="plan-price">${plan.price === 0 ? 'Ücretsiz' : '₺' + plan.price.toFixed(2)}</div>
      <div class="plan-period">/ay</div>
      <div class="plan-storage">${plan.storage}</div>
      <hr class="divider">
      <ul class="feature-list">
        ${plan.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <div class="plan-actions">
        <button class="btn-delete" onclick="deletePlan('${plan.id}')">🗑️ Sil</button>
        <button class="btn-refresh" onclick="editPlan('${plan.id}')">✏️ Düzenle</button>
      </div>
    </div>
  `).join('');
}

async function deletePlan(id) {
  if (!confirm('Plan silinecek. Emin misiniz?')) return;
  try {
    const res = await fetch(`/api/admin/plans/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (res.ok) { showToast('Plan silindi'); loadPlans(); }
    else showToast('Silme hatası', true);
  } catch (e) { showToast('Hata', true); }
}

async function addPlan(e) {
  e.preventDefault();
  const name = document.getElementById('plan-name').value;
  const price = parseFloat(document.getElementById('plan-price').value);
  const yearly = parseFloat(document.getElementById('plan-yearly').value) || Math.round(price * 0.8 * 100) / 100;
  const storage = document.getElementById('plan-storage').value;
  const popular = document.getElementById('plan-popular').value === 'true';
  const features = document.getElementById('plan-features').value.split('\n').filter(f => f.trim());
  if (!name || !price || !storage || features.length === 0) return;

  try {
    const res = await fetch('/api/admin/plans', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, price, priceYearly: yearly, storage, features, popular })
    });
    if (res.ok) { showToast('Plan eklendi'); loadPlans(); }
    else showToast('Ekleme hatası', true);
  } catch (e) { showToast('Hata', true); }
}

document.addEventListener('DOMContentLoaded', () => { loadPlans(); });
