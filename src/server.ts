// src/server.ts

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import routes from './routes';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import { rateLimiterMiddleware } from './middleware/rateLimiter.middleware';

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration for frontend access
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:4173',
    'https://ever-keep.vercel.app',
    'https://ever-keep-git-main-everkeep.vercel.app'
  ],
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(loggerMiddleware);
app.use(rateLimiterMiddleware);

// Routes
app.use(`/${env?.API_VERSION || 'v1'}`, routes);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Start server
const server = app.listen(env?.PORT || 3000, async () => {
  try {
    // Connect to MongoDB database
    await connectDatabase();
    
    logger.info(`🚀 Server running on port ${env?.PORT || 3000} in ${env?.NODE_ENV || 'development'} mode`);
    logger.info(`📚 API Documentation available at http://localhost:${env?.PORT || 3000}/api/${env?.API_VERSION || 'v1'}/docs`);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🔄 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('🔄 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

export default app;
