import app from './app.js';
import "dotenv/config";
import logger from './config/logger.js';
import {connectRedis} from './config/redis.connection.js';

const config = {
  port: process.env.PORT || 3000
};

async function startServer() {
  try {
    // Initialize Redis connection
    const redisConnected = await connectRedis();
    if (redisConnected) {
      logger.info('Redis is available for caching');
    } else {
      logger.info('Running without Redis');
    }

    app.listen(config.port, () => {
      logger.info(`Pulse Talk server running on port ${config.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error(`${error}, Failed to start server`);
    process.exit(1);
  }
}

startServer();