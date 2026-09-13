const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

function generateShareToken() {
  return uuidv4();
}

router.post('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, expires_in, max_downloads } = req.body;
    const file = await query('SELECT * FROM files WHERE id = $1', [id]);
    if (file.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    }
    const token = generateShareToken();
    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;
    await query(
      'INSERT INTO share_links (id, file_id, token, password_hash, expires_at, max_downloads, download_count) VALUES ($1, $2, $3, $4, $5, $6, 0)',
      [v4(), id, token, password ? require('bcryptjs').hashSync(password, 10) : null, expiresAt, max_downloads || null]
    );
    const shareUrl = `${req.protocol}://${req.get('host')}/s/${token}`;
    logger.info(`Share link created for file: ${id}`);
    res.json({ success: true, share_url: shareUrl, token, expires_at: expiresAt });
  } catch (err) {
    logger.error('Share error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/shares', async (req, res) => {
  try {
    const { id } = req.params;
    const shares = await query('SELECT id, token, expires_at, max_downloads, download_count, created_at FROM share_links WHERE file_id = $1 ORDER BY created_at DESC', [id]);
    res.json({ success: true, shares: shares.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:shareId/unshare', async (req, res) => {
  try {
    const { shareId } = req.params;
    await query('DELETE FROM share_links WHERE id = $1', [shareId]);
    res.json({ success: true, message: 'Paylaşım kaldırıldı' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router };
