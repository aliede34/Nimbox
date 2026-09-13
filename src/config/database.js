const { Pool } = require('pg');
const winston = require('winston');

const IS_VERCEL = !!process.env.VERCEL;
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    ...(IS_VERCEL ? [] : [new winston.transports.File({ filename: 'logs/db-error.log', level: 'error' })]),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

const CONN_STRING = process.env.DATABASE_URL || process.env.SERVICE_URI || '';

const pool = new Pool({
  connectionString: CONN_STRING,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000
});

pool.on('connect', () => logger.info('✅ PostgreSQL bağlandı'));
pool.on('error', (err) => logger.error('PostgreSQL connection pool error:', err.message));

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan_id TEXT DEFAULT 'free',
        storage_used BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT,
        path TEXT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT DEFAULT 'anonymous',
        downloads INTEGER DEFAULT 0
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        token_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        action TEXT,
        entity_type TEXT,
        entity_id TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS share_links (
        id TEXT PRIMARY KEY,
        file_id TEXT REFERENCES files(id),
        token TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        expires_at TIMESTAMP,
        max_downloads INTEGER,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('✅ PostgreSQL tablolar oluşturuldu');
    return pool;
  } catch (err) {
    logger.error('DB init error:', err);
    throw err;
  }
}

function getPool() {
  return pool;
}

async function query(sql, params) {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (err) {
    logger.error('Query error:', err.message);
    throw err;
  }
}

module.exports = { initDB, getPool, query, pool };
