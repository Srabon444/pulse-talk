import {JSDOM} from 'jsdom';
import createDOMPurify from 'isomorphic-dompurify';
import logger from '../config/logger.js';

// Create DOM for server-side sanitization
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Configure DOMPurify for safe HTML sanitization
const purifyConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href'],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true
};

// Sanitize string function
const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;

  // Basic HTML sanitization
  const sanitized = DOMPurify.sanitize(input, purifyConfig);

  // Additional cleanup: trim whitespace
  return sanitized.trim();
};

// Recursively sanitize object properties
const sanitizeObject = (obj, fieldsToSanitize = []) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (fieldsToSanitize.length === 0 || fieldsToSanitize.includes(key)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'object' ? sanitizeObject(item, fieldsToSanitize) : sanitizeString(item)
        );
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value, fieldsToSanitize);
      } else {
        sanitized[key] = value;
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Middleware to sanitize request body
export const sanitizeInput = (fieldsToSanitize = []) => {
  return (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') {
        // If no specific fields specified, sanitize common text fields
        const defaultFields = ['content', 'message', 'title', 'description', 'name', 'comment'];
        const fields = fieldsToSanitize.length > 0 ? fieldsToSanitize : defaultFields;

        req.body = sanitizeObject(req.body, fields);

        logger.debug(`Input sanitized for fields: ${fields.join(', ')}`);
      }

      // Also sanitize query parameters if they contain text
      if (req.query && typeof req.query === 'object') {
        const queryFields = ['search', 'q', 'query', 'filter'];
        req.query = sanitizeObject(req.query, queryFields);
      }

      next();
    } catch (error) {
      logger.error(`Input sanitization error: ${error.message}`);
      // Don't block the request, just log the error
      next();
    }
  };
};

// Export utility functions for manual sanitization
export { sanitizeString, sanitizeObject };