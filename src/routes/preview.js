const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip'
};

function getPreviewType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'].includes(ext)) return 'image';
  if (ext === '.pdf') return 'pdf';
  if (['.txt', '.csv', '.md', '.json', '.html', '.css', '.js', '.xml'].includes(ext)) return 'text';
  if (['.doc', '.docx', '.xls', '.xlsx'].includes(ext)) return 'document';
  return 'none';
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

router.get('/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const file = await query('SELECT * FROM files WHERE id = $1', [id]);
    if (file.rows.length === 0) return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    const filePath = path.join(UPLOAD_DIR, file.rows[0].path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    const previewType = getPreviewType(file.rows[0].original_name);
    const mimeType = getMimeType(file.rows[0].original_name);
    res.json({
      success: true,
      preview: {
        type: previewType,
        mime_type: mimeType,
        original_name: file.rows[0].original_name,
        size: file.rows[0].size,
        can_preview: previewType !== 'none'
      }
    });
  } catch (err) {
    logger.error('Preview error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/content', async (req, res) => {
  try {
    const { id } = req.params;
    const file = await query('SELECT * FROM files WHERE id = $1', [id]);
    if (file.rows.length === 0) return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    const filePath = path.join(UPLOAD_DIR, file.rows[0].path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    const ext = path.extname(file.rows[0].original_name).toLowerCase();
    const textExts = ['.txt', '.csv', '.md', '.json', '.html', '.css', '.js', '.xml'];
    if (!textExts.includes(ext)) {
      return res.status(400).json({ success: false, error: 'Sadece metin dosyaları önizlenebilir' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const maxLength = 100000;
    const truncated = content.length > maxLength;
    res.json({
      success: true,
      content: content.substring(0, maxLength),
      original_name: file.rows[0].original_name,
      truncated,
      total_length: content.length
    });
  } catch (err) {
    logger.error('Content error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, getPreviewType };
