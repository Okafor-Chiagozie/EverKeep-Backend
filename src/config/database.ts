// src/config/database.ts

import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

// Create Prisma client instance
const prisma = new PrismaClient({
  log: env?.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Connect to database
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('✅ Successfully connected to MongoDB database');
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB database:', error);
    process.exit(1);
  }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('✅ Successfully disconnected from MongoDB database');
  } catch (error) {
    logger.error('❌ Error disconnecting from MongoDB database:', error);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🔄 Received SIGINT, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🔄 Received SIGTERM, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

export default prisma;
export { prisma };
