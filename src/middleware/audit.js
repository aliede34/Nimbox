const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

async function auditLog(userId, action, entityType, entityId, ipAddress) {
  try {
    const { query } = require('../config/database');
    await query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [userId || 'anonymous', action, entityType, entityId || null, ipAddress || 'unknown']
    );
    logger.info(`Audit: ${action} on ${entityType} by ${userId}`);
  } catch (err) {
    logger.error('Audit log error:', err.message);
  }
}

module.exports = { auditLog };
