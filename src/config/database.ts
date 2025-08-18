// src/config/database.ts

import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

// Connect to database
export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(env.DATABASE_URL);
    logger.info('✅ Successfully connected to MongoDB database');
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB database:', error);
    process.exit(1);
  }
};

// Disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
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

export default mongoose;
export { mongoose };                                                                                    
