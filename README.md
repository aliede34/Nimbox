# Nimbox ☁️

**Nimbox** — Modern cloud storage platform built with Express.js, PostgreSQL , and Redis.

## 📋 Özellikler

- 🔐 **Kullanıcı Kimlik Doğrulama** — Kayıt, giriş, JWT tabanlı oturum yönetimi
- 📦 **Plan Sistemi** — Free, Pro, Premium, Enterprise planları
- 📁 **Dosya Yönetimi** — Yükleme, indirme, silme, arama, sayfalama
- 🔗 **Paylaşım Linkleri** — Şifreli, süreli, indirme limitli paylaşım linkleri
- 🗜️ **ZIP İndirme** — Birden fazla dosyayı tek ZIP olarak indirme
- 👁️ **Dosya Önizleme** — Resim ve metin dosyaları önizleme
- 📊 **Admin Paneli** — Plan, kullanıcı ve istatistik yönetimi
- 📚 **OpenAPI Documentation** — `/api/docs` endpoint'i
- 🛡️ **Audit Log** — Tüm eylemler kayıt altına alınır
- ⚡ **PostgreSQL** — veritabanı

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js 18+
- PostgreSQL 12+
- npm

### Kurulum

```bash
cd site
npm install
npm start
```

### Erişim

| Sayfa | URL |
|-------|-----|
| Ana Sayfa | `http://localhost:3000` |
| Dosyalar | `http://localhost:3000/files` |
| Fiyatlar | `http://localhost:3000/pricing` |
| Giriş | `http://localhost:3000/login` |
| Kayıt | `http://localhost:3000/register` |
| Admin Panel | `http://localhost:3000/admin` |
| API Docs | `http://localhost:3000/api/docs` |

## 📁 Proje Yapısı

```
site/
├── src/
│   ├── server.js              # Ana Express sunucusu
│   ├── routes/
│   │   ├── auth.js            # Kullanıcı auth (kayıt, giriş, çıkış)
│   │   ├── plans.js           # Plan endpoints
│   │   ├── admin.js           # Admin panel endpoints
│   │   ├── share.js           # Paylaşım linki endpoints
│   │   ├── shareRedirect.js   # /s/:token indirme yönlama
│   │   ├── zip.js             # ZIP arşivi oluşturma
│   │   ├── preview.js         # Dosya önizleme & içerik
│   │   └── docs.js            # Swagger / OpenAPI docs
│   ├── config/
│   │   ├── database.js        # PostgreSQL bağlantı
│   │   ├── sessionStore.js    # Veritabanı tabanlı session
│   │   └── valkeyCache.js     # Redis cache (opsiyonel)
│   └── middleware/
│       └── audit.js           # Audit log middleware
├── public/
│   ├── index.html             # Ana sayfa
│   ├── files.html             # Dosyalarım sayfası
│   ├── pricing.html           # Fiyatlar sayfası
│   ├── login.html             # Giriş sayfası
│   ├── register.html          # Kayıt sayfası
│   ├── admin/
│   │   ├── index.html         # Admin dashboard
│   │   ├── plans/index.html   # Admin plan yönetimi
│   │   └── users/index.html   # Admin kullanıcı yönetimi
│   ├── css/
│   │   ├── style.css          # Genel stiller
│   │   └── admin.css          # Admin panel stilleri
│   └── js/
│       ├── ajax.js            # API helper fonksiyonları
│       ├── auth.js            # Auth sayfa JS
│       ├── files.js           # Dosya sayfa JS
│       ├── admin.js           # Admin panel JS
│       ├── admin-plans.js     # Admin plan CRUD JS
│       └── admin-users.js     # Admin kullanıcı JS
├── uploads/                   # Yüklenen dosyalar
├── .env                       # Ortam değişkenleri
├── package.json
├── README.md
└── API_URLS.txt
```

## 🌐 API Endpoint'leri

### Base URL: `http://localhost:3000`

#### 🔐 Auth (Kullanıcı)
```
POST   /api/auth/register        Yeni kayıt ol
POST   /api/auth/login           Giriş yap
GET    /api/auth/me              Kullanıcı bilgisi (token zorunlu)
POST   /api/auth/logout          Çıkış yap
POST   /api/auth/update-plan     Plan değiştir
```

#### 📦 Planlar (Herkes)
```
GET    /api/plans                Tüm planları listele
GET    /api/plans/:id            Tek plan detayı
```

#### 🛡️ Admin Panel
```
POST   /api/admin/login          Admin giriş (body: { secret: "123" })
GET    /api/admin/plans          Plan listesi
POST   /api/admin/plans          Plan ekle
PUT    /api/admin/plans/:id      Plan güncelle
DELETE /api/admin/plans/:id      Plan sil
GET    /api/admin/users          Tüm kullanıcılar
GET    /api/admin/stats          Genel istatistikler
POST   /api/admin/users/:id/toggle Kullanıcı aktif/pasif
```

#### 📁 Dosyalar
```
GET    /api/files                Sayfalı dosya listesi (?page=&limit=)
POST   /api/upload               Tek dosya yükle (multipart/form-data)
POST   /api/upload-multiple      Çoklu dosya yükle
GET    /api/files/:id/download   Dosya indir
DELETE /api/files/:id            Dosya sil
GET    /api/files/:id/info       Dosya bilgisi
POST   /api/files/:id/share      Paylaşım linki oluştur
GET    /api/files/:id/shares     Paylaşım linkleri listesi
DELETE /api/files/:shareId/unshare Paylaşımı kaldır
GET    /api/files/:id/preview    Önizleme bilgisi (image/text)
GET    /api/files/:id/content    Metin dosya içeriği
POST   /api/files/zip            ZIP indir (body: { file_ids: [] })
POST   /api/search               Dosya ara
GET    /api/stats                İstatistikler
GET    /api/health               Sağlık kontrolü
```

#### 🔗 Paylaşım Linki
```
GET    /s/:token                 Paylaşım linki ile dosya indirme
```

#### 📚 API Docs
```
GET    /api/docs                 Swagger belge (JSON)
```

### Header'lar
```
Authorization: Bearer <token>    (admin ve kullanıcı işlemleri için)
Content-Type: application/json   (JSON body için)
```

### Örnek İstek
```bash
# Kayıt ol
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"pass123"}'

# Giriş yap
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123"}'

# Token ile kullanıcı bilgisi
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Admin giriş (şifre: 123)
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"secret":"123"}'

# Admin planları listele
curl http://localhost:3000/api/admin/plans \
  -H "Authorization: Bearer <admin_token>"
```

## 🔧 Yapılandırma

### `.env` Değişkenleri
```env
PORT=3000
MAX_FILE_SIZE=104857600
DATABASE_URL=postgres://user:pass@host:port/db
SERVICE_URI=postgres://user:pass@host:port/db
VALKEY_HOST=127.0.0.1
VALKEY_PORT=6379
VALKEY_PASSWORD=
VALKEY_DB=0
JWT_SECRET=nimbox-super-secret-key-change-in-production-2026
ADMIN_SECRET=123
```

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `PORT` | Sunucu portu | `3000` |
| `MAX_FILE_SIZE` | Maksimum dosya boyutu (bayt) | `100MB` |
| `DATABASE_URL` | PostgreSQL bağlantı stringi | Zorunlu |
| `JWT_SECRET` | JWT şifreleme anahtarı | `nimbox-super-secret-key-change-in-production-2026` |
| `ADMIN_SECRET` | Admin panel giriş şifresi | `123` |
| `VALKEY_*` | Redis bağlantı ayarları | İsteğe bağlı |

## 🗄️ Veritabanı Tabloları

### `users`
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
username TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
plan_id TEXT DEFAULT 'free'
storage_used BIGINT DEFAULT 0
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
last_login TIMESTAMP
is_active BOOLEAN DEFAULT true
```

### `files`
```sql
id TEXT PRIMARY KEY
filename TEXT NOT NULL
original_name TEXT NOT NULL
size INTEGER NOT NULL
mime_type TEXT
path TEXT NOT NULL
uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
user_id TEXT DEFAULT 'anonymous'
downloads INTEGER DEFAULT 0
```

### `sessions`
```sql
id TEXT PRIMARY KEY
user_id TEXT REFERENCES users(id)
token_hash TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
expires_at TIMESTAMP
is_active BOOLEAN DEFAULT true
```

### `share_links`
```sql
id TEXT PRIMARY KEY
file_id TEXT REFERENCES files(id)
token TEXT UNIQUE NOT NULL
password_hash TEXT
expires_at TIMESTAMP
max_downloads INTEGER
download_count INTEGER DEFAULT 0
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### `audit_log`
```sql
id SERIAL PRIMARY KEY
user_id TEXT
action TEXT
entity_type TEXT
entity_id TEXT
ip_address TEXT
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## 📊 Planlar

| Plan | Aylık Fiyat | Depolama |
|------|-------------|----------|
| Free | Ücretsiz | 5 GB |
| Pro | ₺49.99/ay | 50 GB |
| Premium | ₺99.99/ay | 500 GB |
| Enterprise | Özel | Özelleştirilebilir |

## 🛡️ Güvenlik

- **JWT Token** ile kimlik doğrulama (7 gün geçerlik)
- **Bcryptjs** ile şifre hashleme
- **Admin Secret** ile admin panel koruması
- **Paylaşım Linkleri** için şifre ve süre koruması
- **Rate Limiting** (15 dakikada 100 istek)
- **CORS** desteği
- **Audit Log** tüm eylemler kayıt altına alınır

## 🎨 Teknik Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js, Express.js |
| Veritabanı | PostgreSQL |
| Cache | Redis/Valkey (opsiyonel) |
| Auth | JWT + Bcryptjs |
| File Upload | Multer |
| ZIP | Archiver |
| Logging | Winston |
| Rate Limit | express-rate-limit |
| Frontend | Vanilla JS, HTML5, CSS3 |
| API Docs | Swagger/OpenAPI 3.0 |

## 📝 Lisans

MIT License

## 🆘 Sorun Çözüm

### PostgreSQL bağlantı hatası
- `.env` dosyasında `DATABASE_URL` doğru olduğundan emin olun
- Sunucuda IP whitelist'i yapılmış mı kontrol edin

### Admin giriş yapılıyor değil
- Admin şifresi `.env` dosyasındaki `ADMIN_SECRET` değeridir
- Varsayılan: `123`

### Dosya yükleme çalışmıyor
- `uploads/` dizisinin oluşturulmuş olduğundan emin olun
- `MAX_FILE_SIZE` limitini kontrol edin (varsayılan 100MB)

### Port 3000 zaten kullanılıyor
- `.env` dosyasında `PORT` değerini değiştirin

### Redis/Valkey bağlantı hatası
- Valkey isteğe bağlıdır, bağlantı yoksa cache çalışmaz
- Tüm işlemler PostgreSQL üzerinden çalışır
