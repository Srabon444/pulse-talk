import {z} from 'zod';

// User registration schema
export const registerSchema = z.object({
  email: z.email('Invalid email format')
    .min(1, 'Email is required'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters')
});

// User login schema
export const loginSchema = z.object({
  email: z.email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .min(1, 'Password is required')
});

// JWT token schema for validation
export const tokenSchema = z.object({
  userId: z.string(),
  email: z.email(),
  iat: z.number().optional(),
  exp: z.number().optional()
});