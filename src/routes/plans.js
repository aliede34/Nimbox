const express = require('express');
const router = express.Router();
const { cacheGet, cacheSet } = require('../config/valkeyCache');

const DISCOUNT_RATE = 0.20;

function calcYearly(price) {
  if (price === 0) return 0;
  return Math.round(price * (1 - DISCOUNT_RATE) * 100) / 100;
}

function calcDiscount(price, yearlyPrice) {
  if (price === 0) return 0;
  return Math.round((1 - yearlyPrice / price) * 100);
}

const plans = [
  {
    id: 'free',
    name: 'Basic',
    price: 0,
    yearlyPrice: calcYearly(0),
    currency: '₺',
    storage: '5 GB',
    maxUpload: '1 GB',
    maxFiles: '50',
    bandwidth: '10 GB/ay',
    features: [
      '5 GB Bulut Depolama',
      '1 GB Maksimum Yükleme',
      '50 Dosya Sınırı',
      '10 GB/ay Bant Genişliği',
      'Temel Destek',
      'HTTPS Dosya Bağlantıları'
    ],
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99.99,
    yearlyPrice: calcYearly(99.99),
    currency: '₺',
    storage: '100 GB',
    maxUpload: '50 GB',
    maxFiles: '1000',
    bandwidth: '100 GB/ay',
    features: [
      '100 GB Bulut Depolama',
      '50 GB Maksimum Yükleme',
      '1000 Dosya Sınırı',
      '100 GB/ay Bant Genişliği',
      'Öncelikli E-Mail Destek',
      'Paylaşım Linki Oluştur',
      'HTTPS + SSL Şifreleme',
      'İleri Yükleme/İndirme'
    ],
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 199.99,
    yearlyPrice: calcYearly(199.99),
    currency: '₺',
    storage: '1 TB',
    maxUpload: '100 GB',
    maxFiles: 'Unlimited',
    bandwidth: '1 TB/ay',
    features: [
      '1 TB Bulut Depolama',
      '100 GB Maksimum Yükleme',
      'Sınırsız Dosya',
      '1 TB/ay Bant Genişliği',
      '24/7 Türkçe Canlı Destek',
      'Özel Logo / White-label',
      'API Erişimi',
      'İleri Yönetim Paneli',
      'Özel Domain Desteği',
      'Aktivite Raporlama'
    ],
    popular: false
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499.99,
    yearlyPrice: calcYearly(499.99),
    currency: '₺',
    storage: '5 TB',
    maxUpload: 'Unlimited',
    maxFiles: 'Unlimited',
    bandwidth: 'Unlimited',
    features: [
      '5 TB Bulut Depolama',
      'Sınırsız Yükleme',
      'Sınırsız Dosya',
      'Sınırsız Bant Genişliği',
      'Adanmış Hesap Yöneticisi',
      'SSO / Kurumsal Giriş',
      'API + Webhook Entegrasyonu',
      'SLA %99.9 Garantisi',
      'Özel Altyapı',
      'Özel Destek Ekibi',
      'Tüm Premium Özellikler'
    ],
    popular: false
  }
];

const enrichedPlans = plans.map(p => ({
  ...p,
  discount: p.price === 0 ? 0 : calcDiscount(p.price, p.yearlyPrice),
  priceYearlyDisplay: p.yearlyPrice,
  featureCount: p.features.length
}));

router.get('/', async (req, res) => {
  try {
    const cached = await cacheGet('plans');
    if (cached) return res.json(cached);
    const data = { success: true, plans: enrichedPlans, discountRate: Math.round(DISCOUNT_RATE * 100) };
    await cacheSet('plans', data, 300);
    res.json(data);
  } catch (err) {
    res.json({ success: true, plans: enrichedPlans, discountRate: Math.round(DISCOUNT_RATE * 100) });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const cached = await cacheGet(`plan:${req.params.id}`);
    if (cached) return res.json(cached);
    const plan = enrichedPlans.find(p => p.id === req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: 'Plan bulunamadı' });
    await cacheSet(`plan:${req.params.id}`, plan, 300);
    res.json({ success: true, plan });
  } catch (err) {
    const plan = enrichedPlans.find(p => p.id === req.params.id);
    if (!plan) return res.status(404).json({ success: false, error: 'Plan bulunamadı' });
    res.json({ success: true, plan });
  }
});

module.exports = { router, plans: enrichedPlans };
