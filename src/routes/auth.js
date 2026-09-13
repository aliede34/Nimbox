const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken, verifyToken, setSession, getSession, delSession, authMiddleware } = require('../config/sessionStore');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const SALT_ROUNDS = 12;

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ success: false, error: 'Tüm alanlar zorunlu' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Şifre en az 6 karakter' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Geçersiz email formatı' });
    }

    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Bu email zaten kayıtlı' });
    }

    const usernameCheck = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ success: false, error: 'Bu kullanıcı adı zaten alınmış' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = require('uuid').v4();

    await query(
      'INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, email, username, passwordHash]
    );

    const token = generateToken(userId);
    const userResult = await query('SELECT id, email, username, plan_id, storage_used FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    await setSession(userId, { id: userId, email, username, plan_id: 'free' }, 3600);
    logger.info(`Yeni kayıt: ${email}`);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Kayıt hatası' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email ve şifre zorunlu' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, error: 'Kullanıcı bulunamadı veya hesap pasif' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Hatalı şifre' });
    }

    const token = generateToken(user.id);
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    const userData = { id: user.id, email: user.email, username: user.username, plan_id: user.plan_id, storage_used: user.storage_used };
    await setSession(user.id, userData, 3600);

    logger.info(`Giriş yapıldı: ${email}`);
    res.json({ success: true, token, user: userData });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Giriş hatası' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const cached = await getSession(req.user.id);
    if (cached) {
      return res.json({ success: true, user: cached });
    }
    const result = await query('SELECT id, email, username, plan_id, storage_used, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    const user = result.rows[0];
    await setSession(user.id, user, 3600);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Hata' });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  await delSession(req.user.id);
  res.json({ success: true, message: 'Çıkış yapıldı' });
});

router.post('/update-plan', authMiddleware, async (req, res) => {
  try {
    const { plan_id } = req.body;
    const validPlans = ['free', 'pro', 'premium', 'enterprise'];
    if (!validPlans.includes(plan_id)) {
      return res.status(400).json({ success: false, error: 'Geçersiz plan' });
    }
    await query('UPDATE users SET plan_id = $1 WHERE id = $2', [plan_id, req.user.id]);
    const result = await query('SELECT id, email, username, plan_id, storage_used FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    await setSession(user.id, user, 3600);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Hata' });
  }
});

module.exports = { router, authMiddleware };
