import bcrypt from 'bcrypt';
import logger from '../config/logger.js';

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;

export const hashPassword = async (password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    logger.error(`${error}, Failed to hash password`);
    throw new Error('Password hashing failed');
  }
};

export const comparePassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error(`${error}, Failed to compare password`);
    throw new Error('Password comparison failed');
  }
};