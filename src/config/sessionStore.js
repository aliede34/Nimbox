const { query } = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const JWT_SECRET = process.env.JWT_SECRET || 'nimbox-super-secret-key-change-in-production-2026';
const SESSION_TTL = 3600;

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

async function setSession(userId, data, ttl = SESSION_TTL) {
  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await query(
      `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, is_active) VALUES ($1, $2, $3, NOW(), $4, true) ON CONFLICT (id) DO UPDATE SET token_hash = $3, expires_at = $4, is_active = true, created_at = NOW()`,
      [sessionId, userId, null, expiresAt]
    );
    await query(
      `UPDATE sessions SET user_id = $1, token_hash = $2, expires_at = $3, is_active = true WHERE user_id = $1 AND id = (SELECT id FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
      [userId, null, expiresAt]
    );
    logger.info(`Session set for user: ${userId}`);
    return true;
  } catch (err) {
    logger.error('setSession error:', err.message);
    return false;
  }
}

async function getSession(userId) {
  try {
    const result = await query('SELECT * FROM sessions WHERE user_id = $1 AND is_active = true AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1', [userId]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (err) {
    logger.error('getSession error:', err.message);
    return null;
  }
}

async function delSession(userId) {
  try {
    await query('UPDATE sessions SET is_active = false WHERE user_id = $1', [userId]);
    logger.info(`Session deleted for user: ${userId}`);
    return true;
  } catch (err) {
    logger.error('delSession error:', err.message);
    return false;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Giriş yapın' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Geçersiz token' });
  }
  req.user = decoded;
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware, setSession, getSession, delSession, JWT_SECRET };
