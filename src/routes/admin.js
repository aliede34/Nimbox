const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const ADMIN_SECRET = process.env.ADMIN_SECRET || '123';
const JWT_SECRET = process.env.JWT_SECRET || 'nimbox-super-secret-key-change-in-production-2026';

function generateAdminToken(adminId) {
  return jwt.sign({ adminId, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
}

function verifyAdminToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Admin girişi yapın' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyAdminToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Geçersiz admin token' });
  }
  req.admin = decoded;
  next();
}

router.post('/login', async (req, res) => {
  try {
    const { secret } = req.body;
    if (!secret) {
      return res.status(400).json({ success: false, error: 'Admin sifresi zorunlu' });
    }
    if (secret !== ADMIN_SECRET) {
      logger.warn('Invalid admin login attempt');
      return res.status(401).json({ success: false, error: 'Geçersiz admin sifresi' });
    }
    const token = generateAdminToken('admin');
    logger.info('Admin giriş yapıldı');
    res.json({ success: true, token, role: 'admin' });
  } catch (err) {
    logger.error('Admin login error:', err);
    res.status(500).json({ success: false, error: 'Giriş hatası' });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const plansData = require('../routes/plans').plans;
    res.json({ success: true, plans: plansData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/plans', adminAuth, async (req, res) => {
  try {
    const { name, price, priceYearly, storage, features, currency, popular } = req.body;
    if (!name || !price || !storage || !features || !Array.isArray(features)) {
      return res.status(400).json({ success: false, error: 'Zorunlu alanlar eksik' });
    }
    const plansData = require('../routes/plans').plans;
    const newPlan = {
      id: require('uuid').v4(),
      name,
      price,
      yearlyPrice: priceYearly || Math.round(price * 0.8 * 100) / 100,
      currency: currency || '₺',
      storage,
      maxUpload: req.body.maxUpload || 'N/A',
      maxFiles: req.body.maxFiles || 'N/A',
      bandwidth: req.body.bandwidth || 'N/A',
      features,
      popular: popular || false
    };
    plansData.push(newPlan);
    logger.info(`Plan oluşturuldu: ${name}`);
    res.status(201).json({ success: true, plan: newPlan });
  } catch (err) {
    logger.error('Create plan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/plans/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, priceYearly, storage, features, popular } = req.body;
    const plansData = require('../routes/plans').plans;
    const index = plansData.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Plan bulunamadı' });
    }
    plansData[index] = { ...plansData[index], ...req.body };
    logger.info(`Plan güncellendi: ${id}`);
    res.json({ success: true, plan: plansData[index] });
  } catch (err) {
    logger.error('Update plan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/plans/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const plansData = require('../routes/plans').plans;
    const index = plansData.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Plan bulunamadı' });
    }
    const removed = plansData.splice(index, 1);
    logger.info(`Plan silindi: ${id}`);
    res.json({ success: true, removed: removed[0] });
  } catch (err) {
    logger.error('Delete plan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await query('SELECT id, email, username, plan_id, storage_used, created_at, is_active FROM users ORDER BY created_at DESC');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const totalFiles = await query('SELECT COUNT(*) as count FROM files');
    const totalSize = await query('SELECT COALESCE(SUM(size), 0) as total FROM files');
    const totalUsers = await query('SELECT COUNT(*) as count FROM users');
    const activeUsers = await query("SELECT COUNT(*) as count FROM users WHERE is_active = true");
    res.json({
      success: true,
      stats: {
        totalFiles: parseInt(totalFiles.rows[0].count),
        totalSize: parseInt(totalSize.rows[0].total),
        totalUsers: parseInt(totalUsers.rows[0].count),
        activeUsers: parseInt(activeUsers.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, adminAuth, generateAdminToken };
