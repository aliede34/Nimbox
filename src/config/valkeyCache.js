const { getRedis, isConnected } = require('./valkey');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const CACHE_TTL = {
  files: 30,
  stats: 60,
  plans: 300,
  default: 60
};

async function cacheGet(key) {
  try {
    if (!isConnected()) return null;
    const data = await getRedis().get(`nimbox:${key}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error('Cache get error:', err.message);
    return null;
  }
}

async function cacheSet(key, value, ttl = CACHE_TTL.default) {
  try {
    if (!isConnected()) return false;
    await getRedis().setex(`nimbox:${key}`, ttl, JSON.stringify(value));
    return true;
  } catch (err) {
    logger.error('Cache set error:', err.message);
    return false;
  }
}

async function cacheDel(key) {
  try {
    if (!isConnected()) return false;
    await getRedis().del(`nimbox:${key}`);
    return true;
  } catch (err) {
    logger.error('Cache del error:', err.message);
    return false;
  }
}

async function cacheDelPattern(pattern) {
  try {
    if (!isConnected()) return false;
    const keys = await getRedis().keys(`nimbox:${pattern}`);
    if (keys.length > 0) {
      await getRedis().del(keys);
    }
    return true;
  } catch (err) {
    logger.error('Cache delPattern error:', err.message);
    return false;
  }
}

function cacheMiddleware(ttl = 30) {
  return async (req, res, next) => {
    const key = req.originalUrl || req.path;
    try {
      const cached = await cacheGet(key);
      if (cached) {
        logger.info(`Cache HIT: ${key}`);
        return res.json(cached);
      }
      logger.info(`Cache MISS: ${key}`);
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        cacheSet(key, data, ttl);
        originalJson(data);
      };
      next();
    } catch (err) {
      next();
    }
  };
}

async function getSession(userId) {
  try {
    if (!isConnected()) return null;
    const data = await getRedis().get(`nimbox:session:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

async function setSession(userId, data, ttl = 3600) {
  try {
    if (!isConnected()) return false;
    await getRedis().setex(`nimbox:session:${userId}`, ttl, JSON.stringify(data));
    return true;
  } catch { return false; }
}

async function delSession(userId) {
  try {
    if (!isConnected()) return false;
    await getRedis().del(`nimbox:session:${userId}`);
    return true;
  } catch { return false; }
}

async function getRateLimitKey(key) {
  try {
    if (!isConnected()) return null;
    const data = await getRedis().hgetall(`nimbox:ratelimit:${key}`);
    return data && data.count ? data : null;
  } catch { return null; }
}

async function setRateLimitKey(key, count, ttl) {
  try {
    if (!isConnected()) return false;
    await getRedis().setex(`nimbox:ratelimit:${key}`, ttl, count);
    return true;
  } catch { return false; }
}

async function incrementRateLimit(key, ttl = 60) {
  try {
    if (!isConnected()) return { count: 1, limit: Infinity };
    const count = await getRedis().incr(`nimbox:ratelimit:${key}`);
    if (count === 1) {
      await getRedis().expire(`nimbox:ratelimit:${key}`, ttl);
    }
    return { count, limit: Math.ceil(count * 1.5) };
  } catch { return { count: 1, limit: Infinity }; }
}

async function flushAll() {
  try {
    if (!isConnected()) return false;
    await getRedis().flushdb();
    logger.info('Valkey cache flushed');
    return true;
  } catch { return false; }
}

module.exports = {
  cacheGet, cacheSet, cacheDel, cacheDelPattern, cacheMiddleware
};
