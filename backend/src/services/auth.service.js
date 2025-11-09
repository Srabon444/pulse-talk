import {prisma} from '../config/prisma.connection.js';
import {hashPassword, comparePassword} from '../utils/password.utils.js';
import {generateToken} from '../utils/jwt.utils.js';
import logger from '../config/logger.js';

export const registerUser = async (userData) => {
  try {
    const {email, username, password} = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {email: email},
          {username: username}
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('User with this email already exists');
      }
      if (existingUser.username === username) {
        throw new Error('Username is already taken');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true
      }
    });

    // Generate JWT token for auto-login
    const tokenPayload = {
      userId: newUser.id,
      email: newUser.email
    };

    const token = generateToken(tokenPayload);

    logger.info(`User registered successfully, UserId: ${newUser.id}`);

    return {
      success: true,
      data: {
        user: newUser,
        token
      },
      message: 'User registered successfully'
    };
  } catch (error) {
    logger.error(`User registration failed: ${error.message}`);
    return {
      success: false,
      message: error.message || 'Registration failed'
    };
  }
};

export const loginUser = async (credentials) => {
  try {
    const {email, password} = credentials;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: {email}
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email
    };

    const token = generateToken(tokenPayload);

    logger.info(`User logged in successfully, Userid: ${user.id}`);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        token
      },
      message: 'Login successful'
    };
  } catch (error) {
    logger.error(`User login failed: ${error.message}`);
    return {
      success: false,
      message: 'Login failed'
    };
  }
};

export const getUserById = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true
      }
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    logger.error(`Failed to get user by ID: ${error.message}`);
    return {
      success: false,
      message: 'Failed to get user'
    };
  }
};