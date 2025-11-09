import app from './app.js';
import "dotenv/config";
import { createServer } from 'http';
import logger from './config/logger.js';
import { connectRedis } from './config/redis.connection.js';
import { initSocketServer } from './services/socket.service.js';

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

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io
    initSocketServer(httpServer);

    // Start server
    httpServer.listen(config.port, () => {
      logger.info(`Pulse Talk server running on port ${config.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Socket.io connection is ready`);
    });
  } catch (error) {
    logger.error(`${error}, Failed to start server`);
    process.exit(1);
  }
}

startServer();