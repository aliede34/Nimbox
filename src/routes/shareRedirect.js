const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const share = await query('SELECT * FROM share_links WHERE token = $1', [token]);
    if (share.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Paylaşım linki geçersiz' });
    }
    const shareLink = share.rows[0];
    if (shareLink.expires_at && new Date() > new Date(shareLink.expires_at)) {
      return res.status(410).json({ success: false, error: 'Paylaşım linki süresi dolmuş' });
    }
    if (shareLink.max_downloads !== null && shareLink.download_count >= shareLink.max_downloads) {
      return res.status(410).json({ success: false, error: 'Maksimum indirme sayısına ulaşıldı' });
    }
    const file = await query('SELECT * FROM files WHERE id = $1', [shareLink.file_id]);
    if (file.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    }
    await query('UPDATE share_links SET download_count = download_count + 1 WHERE id = $1', [shareLink.id]);
    const filePath = path.join(UPLOAD_DIR, file.rows[0].path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Dosya sunucuda bulunamadı' });
    }
    res.download(filePath, file.rows[0].original_name, (err) => {
      if (err) logger.error('Download error:', err.message);
    });
    logger.info(`Shared file downloaded: ${shareLink.file_id}`);
  } catch (err) {
    logger.error('Share redirect error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router };
