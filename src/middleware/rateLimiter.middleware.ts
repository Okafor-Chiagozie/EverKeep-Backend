import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const rateLimiterMiddleware = rateLimit({
  windowMs: env?.RATE_LIMIT_WINDOW_MS || 1 * 60 * 1000, // 1 minute instead of 15
  max: env?.RATE_LIMIT_MAX_REQUESTS || 100, // 100 requests per minute instead of 1000
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
});

export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes instead of 10
  max: 50, // 50 attempts instead of 20
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
});