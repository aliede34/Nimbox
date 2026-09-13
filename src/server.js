require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const { router: plansRouter } = require('./routes/plans');
const { router: authRouter } = require('./routes/auth');
const { router: adminRouter } = require('./routes/admin');
const { router: shareRouter } = require('./routes/share');
const { router: zipRouter } = require('./routes/zip');
const { router: previewRouter } = require('./routes/preview');
const { router: docsRouter } = require('./routes/docs');
const { initDB, query, getPool } = require('./config/database');
function cacheMiddleware() { return (req, res, next) => next(); }

const app = express();
const PORT = process.env.PORT || 3000;

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? '/tmp/nimbox' : path.join(__dirname, '..');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const LOG_DIR = path.join(DATA_DIR, 'logs');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

[LOG_DIR, UPLOAD_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`Dizin oluşturulamadı (${dir}):`, err.message);
  }
});
try {
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
} catch (err) {
  console.error('public dizini oluşturulamadı:', err.message);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    ...(IS_VERCEL ? [] : [new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' })]) ,
    ...(IS_VERCEL ? [] : [new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log') })]),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

let dbReady = false;

initAll().then(() => {
  logger.info('✅ Module initialized');
});

async function initAll() {
  try {
    await initDB();
    dbReady = true;
    logger.info('✅ PostgreSQL başlatıldı');
  } catch (err) {
    logger.error('PostgreSQL başlatma hatası:', err.message);
  }
  return dbReady;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.get('/api/health', async (req, res) => {
  res.json({
    name: 'Nimbox',
    status: 'ok',
    uptime: process.uptime(),
    postgres: dbReady
  });
});

app.get('/api/files', cacheMiddleware(30), async (req, res) => {
  try {
    if (!dbReady) return res.status(503).json({ success: false, error: 'Database bağlantısı yok' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const files = await query('SELECT * FROM files ORDER BY uploaded_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    const total = await query('SELECT COUNT(*) as count FROM files');
    const formatted = files.rows.map(f => ({
      ...f,
      size: formatSize(f.size),
      uploaded_at: new Date(f.uploaded_at).toLocaleDateString('tr-TR'),
      url: `/uploads/${f.path}`
    }));
    res.json({ success: true, files: formatted, pagination: { page, limit, total: parseInt(total.rows[0].count), totalPages: Math.ceil(parseInt(total.rows[0].count) / limit) } });
  } catch (err) {
    logger.error('Failed to list files:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const fileId = uuidv4();
    const fileData = {
      id: fileId, filename: req.file.filename, original_name: req.file.originalname,
      size: req.file.size, mime_type: req.file.mimetype, path: req.file.filename,
      uploaded_at: new Date().toISOString()
    };
    await query(
      'INSERT INTO files (id, filename, original_name, size, mime_type, path) VALUES ($1, $2, $3, $4, $5, $6)',
      [fileData.id, fileData.filename, fileData.original_name, fileData.size, fileData.mime_type, fileData.path]
    );
    await query('UPDATE files SET user_id = $1 WHERE id = $2', ['anonymous', fileId]);
    logger.info(`File uploaded: ${fileData.original_name} (${formatSize(fileData.size)})`);
    res.json({ success: true, file: fileData, url: `/uploads/${fileData.filename}` });
  } catch (err) {
    logger.error('Upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/upload-multiple', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, error: 'No files uploaded' });
    const results = [];
    for (const file of req.files) {
      const fileId = uuidv4();
      const fileData = { id: fileId, filename: file.filename, original_name: file.originalname, size: file.size, mime_type: file.mimetype, path: file.filename, uploaded_at: new Date().toISOString() };
      await query(
        'INSERT INTO files (id, filename, original_name, size, mime_type, path) VALUES ($1, $2, $3, $4, $5, $6)',
        [fileData.id, fileData.filename, fileData.original_name, fileData.size, fileData.mime_type, fileData.path]
      );
      results.push(fileData);
    }
    res.json({ success: true, files: results, count: results.length });
  } catch (err) {
    logger.error('Multi upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/files/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const file = await query('SELECT path FROM files WHERE id = $1', [id]);
    if (file.rows.length === 0) return res.status(404).json({ success: false, error: 'File not found' });
    const filePath = path.join(UPLOAD_DIR, file.rows[0].path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await query('DELETE FROM files WHERE id = $1', [id]);
    logger.info(`File deleted: ${id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/files/:id/download', async (req, res) => {
  try {
    const id = req.params.id;
    const file = await query('SELECT * FROM files WHERE id = $1', [id]);
    if (file.rows.length === 0) return res.status(404).json({ success: false, error: 'File not found' });
    const filePath = path.join(UPLOAD_DIR, file.rows[0].path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: 'File not found on disk' });
    await query('UPDATE files SET downloads = downloads + 1 WHERE id = $1', [id]);
    res.download(filePath, file.rows[0].original_name);
    logger.info(`File downloaded: ${file.rows[0].original_name}`);
  } catch (err) {
    logger.error('Download error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/files/:id/info', async (req, res) => {
  try {
    const id = req.params.id;
    const file = await query('SELECT * FROM files WHERE id = $1', [id]);
    if (file.rows.length === 0) return res.status(404).json({ success: false, error: 'File not found' });
    res.json({ success: true, file: { ...file.rows[0], size: formatSize(file.rows[0].size), url: `/uploads/${file.rows[0].path}` } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/stats', cacheMiddleware(60), async (req, res) => {
  try {
    if (!dbReady) return res.status(503).json({ success: false, error: 'Database bağlantısı yok' });
    const totalFiles = await query('SELECT COUNT(*) as count FROM files');
    const totalSize = await query('SELECT COALESCE(SUM(size), 0) as total FROM files');
    const latest = await query('SELECT * FROM files ORDER BY uploaded_at DESC LIMIT 5');
    res.json({
      success: true,
      stats: {
        totalFiles: parseInt(totalFiles.rows[0].count),
        totalSize: formatSize(parseInt(totalSize.rows[0].total)),
        latest: latest.rows.map(f => ({ ...f, size: formatSize(f.size) }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/search', async (req, res) => {
  try {
    const { q } = req.body;
    if (!q) return res.json({ success: true, files: [] });
    const files = await query("SELECT * FROM files WHERE original_name LIKE $1 ORDER BY uploaded_at DESC", [`%${q}%`]);
    res.json({ success: true, files: files.rows.map(f => ({ ...f, size: formatSize(f.size) })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/api/plans', plansRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/files', shareRouter);
app.use('/api/files', zipRouter);
app.use('/api/files', previewRouter);
app.use('/api/docs', docsRouter);

const PAGES = {
  index: path.join(PUBLIC_DIR, 'index.html'),
  files: path.join(PUBLIC_DIR, 'files.html'),
  pricing: path.join(PUBLIC_DIR, 'pricing.html'),
  login: path.join(PUBLIC_DIR, 'login.html'),
  register: path.join(PUBLIC_DIR, 'register.html'),
  admin: path.join(PUBLIC_DIR, 'admin', 'index.html'),
  adminPlans: path.join(PUBLIC_DIR, 'admin', 'plans', 'index.html'),
  adminUsers: path.join(PUBLIC_DIR, 'admin', 'users', 'index.html')
};

app.get('/', (req, res) => res.sendFile(PAGES.index));
app.get('/files', (req, res) => res.sendFile(PAGES.files));
app.get('/pricing', (req, res) => res.sendFile(PAGES.pricing));
app.get('/login', (req, res) => res.sendFile(PAGES.login));
app.get('/register', (req, res) => res.sendFile(PAGES.register));
app.get('/dashboard', (req, res) => res.sendFile(PAGES.index));
app.get('/admin', (req, res) => res.sendFile(PAGES.admin));
app.get('/admin/plans', (req, res) => res.sendFile(PAGES.adminPlans));
app.get('/admin/users', (req, res) => res.sendFile(PAGES.adminUsers));

const { router: shareRedirectRouter } = require('./routes/shareRedirect');
app.use('/s', shareRedirectRouter);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Dosya çok büyük (maksimum 100MB)' });
    return res.status(400).json({ success: false, error: err.message });
  }
  logger.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Sunucu hatası' });
});

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function startServer() {
  return app.listen(PORT, () => {
    logger.info(`Nimbox cloud storage running on http://localhost:${PORT}`);
    logger.info(`PostgreSQL: ${dbReady ? 'Bağlı' : 'Bağlantı yok'}`);
  });
}

process.on('SIGINT', async () => {
  logger.info('Kapatılıyor...');
  process.exit(0);
});

module.exports = { app, startServer, formatSize, initAll };

if (require.main === module) {
  startServer();
}
