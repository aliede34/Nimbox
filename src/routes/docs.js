const express = require('express');
const router = express.Router();
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const SWAGGER_SPEC = {
  openapi: '3.0.0',
  info: {
    title: 'Nimbox API',
    version: '1.0.0',
    description: 'Nimbox Cloud Storage API Documentation'
  },
  servers: [{ url: 'http://localhost:3000' }],
  paths: {
    '/api/health': {
      get: { summary: 'Sağlık kontrolü', responses: { '200': { description: 'OK' } } }
    },
    '/api/auth/register': {
      post: {
        summary: 'Yeni kayıt ol',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, username: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { '201': { description: 'Kayıt başarılı' } }
      }
    },
    '/api/auth/login': {
      post: { summary: 'Giriş yap', responses: { '200': { description: 'Token döner' } } }
    },
    '/api/files': {
      get: { summary: 'Dosyaları listele', responses: { '200': { description: 'Dosya listesi' } } },
      post: { summary: 'Dosya yükle', responses: { '201': { description: 'Yüklendi' } } }
    },
    '/api/files/:id/download': { get: { summary: 'Dosya indir' } },
    '/api/files/:id/delete': { delete: { summary: 'Dosya sil' } },
    '/api/files/:id/share': { post: { summary: 'Paylaşım linki oluştur' } },
    '/api/files/:id/preview': { get: { summary: 'Dosya önizleme' } },
    '/api/files/search': { post: { summary: 'Dosya ara' } },
    '/api/stats': { get: { summary: 'İstatistikler' } },
    '/api/plans': {
      get: { summary: 'Planları listele' },
      post: { summary: 'Plan ekle (admin)' }
    },
    '/api/admin/plans': {
      get: { summary: 'Admin: Plan listesi' },
      post: { summary: 'Admin: Plan ekle' },
      put: { summary: 'Admin: Plan güncelle' },
      delete: { summary: 'Admin: Plan sil' }
    },
    '/api/admin/users': { get: { summary: 'Admin: Kullanıcı listesi' } },
    '/api/admin/stats': { get: { summary: 'Admin: Genel istatistikler' } }
  }
};

router.get('/', (req, res) => {
  res.json({ success: true, data: SWAGGER_SPEC });
});

router.get('/json', (req, res) => {
  res.json({ success: true, data: SWAGGER_SPEC });
});

module.exports = { router };
