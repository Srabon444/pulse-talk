import {registerUser, loginUser, getUserById} from '../services/auth.service.js';
import {registerSchema, loginSchema} from '../schemas/auth.schemas.js';
import {getCookieOptions} from '../utils/jwt.utils.js';
import logger from '../config/logger.js';

export const register = async (req, res) => {
  try {
    // Validate request data
    const validationResult = registerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.errors
      });
    }
    const result = await registerUser(validationResult.data);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error(`${error}, Registration controller error`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const login = async (req, res) => {
  try {
    // Validate request data
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        errors: validationResult.error.errors
      });
    }
    const result = await loginUser(validationResult.data);

    if (result.success) {
      // Set JWT token in cookie
      res.cookie('token', result.data.token, getCookieOptions());

      res.status(200).json({
        success: true,
        data: {
          user: result.data.user,
          token: result.data.token
        },
        message: result.message
      });
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    logger.error(`${error}, Login controller error`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie('token', getCookieOptions());
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error(`${error}, Logout controller error`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await getUserById(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    logger.error(`${error}, Get profile controller error`);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};