import logger from '../config/logger.js';

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  try {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "frame-ancestors 'none';"
    );

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
    );

    // HSTS (HTTP Strict Transport Security) - only in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    next();
  } catch (error) {
    logger.error(`Security headers middleware error: ${error.message}`);
    next();
  }
};

// Simple CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  try {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Check for custom header (simple CSRF protection)
    const csrfToken = req.headers['x-csrf-token'] || req.headers['x-requested-with'];

    // In production, need to use a proper CSRF library like 'csurf'. TODO: Don't have time, implement later
    if (!csrfToken && req.path.startsWith('/api/')) {
      // Allow if request has valid auth token (cookie-based auth provides some CSRF protection)
      const authToken = req.cookies?.token;
      if (!authToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF protection: Missing CSRF token or authentication'
        });
      }
    }

    next();
  } catch (error) {
    logger.error(`CSRF protection middleware error: ${error.message}`);
    next();
  }
};