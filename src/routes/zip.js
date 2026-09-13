const express = require('express');
const router = express.Router();
const archiver = require('archiver');
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

router.post('/zip', async (req, res) => {
  try {
    const { file_ids } = req.body;
    if (!file_ids || !Array.isArray(file_ids) || file_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'file_ids zorunlu' });
    }
    const files = await query('SELECT * FROM files WHERE id = ANY($1)', [file_ids]);
    if (files.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dosya bulunamadı' });
    }
    const zipName = `nimbox-${Date.now()}.zip`;
    const outputPath = path.join(UPLOAD_DIR, zipName);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    for (const file of files.rows) {
      const filePath = path.join(UPLOAD_DIR, file.path);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.original_name });
      }
    }
    await archive.finalize();
    await new Promise(resolve => output.on('close', resolve));
    res.download(outputPath, zipName, (err) => {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      if (err) logger.error('ZIP download error:', err);
    });
    logger.info(`ZIP created with ${files.rows.length} files`);
  } catch (err) {
    logger.error('ZIP error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router };
