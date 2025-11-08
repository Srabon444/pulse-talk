import "dotenv/config";
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {connectPrisma} from './config/prisma.connection.js';
import logger from './config/logger.js';

// Routes


// Middlewares
import {notFoundHandler, globalErrorHandler} from './middleware/error.middleware.js';


const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: {policy: "cross-origin"}
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);


// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({extended: true}));

// Database connection
connectPrisma().then(() => {
  logger.info("Application initialization completed");
}).catch((error) => {
  logger.error(`${error}, Failed to initialize application`);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req, res) => {
  logger.debug("Health check endpoint accessed");
  res.status(200).json({
    success: true,
    message: 'Pulse Talk Comment System API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes


// 404 for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;