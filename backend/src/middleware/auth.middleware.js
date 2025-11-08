import {verifyToken} from '../utils/jwt.utils.js';
import logger from '../config/logger.js';

export const authenticateToken = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const result = verifyToken(token);

    if (!result.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = result.data;
    next();
  } catch (error) {
    logger.error(`${error}, Authentication middleware error`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (token) {
      const result = verifyToken(token);
      if (result.success) {
        req.user = result.data;
      }
    }

    next();
  } catch (error) {
    logger.error(`${error}, Optional authentication middleware error`);
    next();
  }
};