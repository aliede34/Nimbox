const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

let redis = null;

async function connectValkey() {
  logger.info('Valkey devre dışı (yerel yapılacak istenirse yapılandırın)');
  return null;
}

function getRedis() {
  return null;
}

function isConnected() {
  return false;
}

async function disconnectValkey() {
  redis = null;
}

module.exports = { connectValkey, getRedis, isConnected, disconnectValkey };
