import {getRedisClient, isRedisConnected} from '../config/redis.connection.js';
import logger from '../config/logger.js';

export const cacheService = {
  // Get data from cache
  get: async (key) => {
    try {
      if (!isRedisConnected()) {
        return null;
      }

      const client = getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  },

  // Set data in cache with TTL
  set: async (key, data, ttlSeconds = 300) => {
    try {
      if (!isRedisConnected()) {
        return false;
      }

      const client = getRedisClient();
      await client.setEx(key, ttlSeconds, JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}: ${error.message}`);
      return false;
    }
  },

  // Delete specific cache key
  del: async (key) => {
    try {
      if (!isRedisConnected()) {
        return false;
      }

      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}: ${error.message}`);
      return false;
    }
  },

  // Delete cache keys by pattern
  delPattern: async (pattern) => {
    try {
      if (!isRedisConnected()) {
        return false;
      }

      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}: ${error.message}`);
      return false;
    }
  }
};

// Cache key generators
export const cacheKeys = {
  commentsList: (page, limit, sortBy) => `comments:list:${page}:${limit}:${sortBy}`,
  commentDetails: (commentId) => `comments:details:${commentId}`,
  commentReplies: (commentId) => `comments:replies:${commentId}`
};