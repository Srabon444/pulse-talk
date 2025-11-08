import { createClient } from 'redis';
import logger from './logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;
let isRedisAvailable = false;

export async function connectRedis() {
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });

    // Only set up event handlers if connection is successful
    await redisClient.connect();
    
    redisClient.on('error', (err) => {
      logger.error({ error: err }, 'Redis Client Error');
      isRedisAvailable = false;
    });

    redisClient.on('ready', () => {
      logger.info('Redis Client connected and ready');
      isRedisAvailable = true;
    });

    redisClient.on('end', () => {
      logger.info('Redis Client connection ended');
      isRedisAvailable = false;
    });

    logger.info('Redis connected successfully');
    isRedisAvailable = true;
    return true;
  } catch (error) {
    logger.warn({ error: error.message }, '⚠️ Redis connection failed - continuing without Redis');
    redisClient = null;
    isRedisAvailable = false;
    return false;
  }
}

export function getRedisClient() {
  return isRedisAvailable ? redisClient : null;
}

export function isRedisConnected() {
  return isRedisAvailable;
}

export { redisClient };

export default redisClient;