import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Contact, Vault, VaultEntry, VaultRecipient, Notification } from '../models';
import { env } from './env';
import { logger } from './logger';

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(env.DATABASE_URL);
    logger.info('Connected to database for seeding');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Contact.deleteMany({}),
      Vault.deleteMany({}),
      VaultEntry.deleteMany({}),
      VaultRecipient.deleteMany({}),
      Notification.deleteMany({}),
    ]);
    logger.info('Cleared existing data');

    // Create sample user
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await User.create({
      email: 'admin@everkeep.com',
      fullName: 'Admin User',
      password: hashedPassword,
      isVerified: true,
      inactivityThresholdDays: 30,
    });
    logger.info('Created sample user');

    // Create sample contact
    const contact = await Contact.create({
      userId: user._id,
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      relationship: 'Friend',
      isVerified: true,
    });
    logger.info('Created sample contact');

    // Create sample vault
    const vault = await Vault.create({
      userId: user._id,
      name: 'Personal Vault',
      description: 'My personal digital legacy vault',
      isActive: true,
      encryptionKey: 'sample-encryption-key',
    });
    logger.info('Created sample vault');

    // Create sample vault entry
    const vaultEntry = await VaultEntry.create({
      vaultId: vault._id,
      type: 'text',
      content: 'This is a sample message for my loved ones.',
    });
    logger.info('Created sample vault entry');

    // Create sample vault recipient
    await VaultRecipient.create({
      vaultId: vault._id,
      contactId: contact._id,
    });
    logger.info('Created sample vault recipient');

    // Create sample notification
    await Notification.create({
      userId: user._id,
      type: 'system',
      title: 'Welcome to EverKeep',
      message: 'Your account has been successfully created!',
      isRead: false,
    });
    logger.info('Created sample notification');

    logger.info('✅ Database seeding completed successfully');
  } catch (error) {
    logger.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from database');
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
} 