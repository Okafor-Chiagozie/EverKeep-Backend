import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu/1m', // 'password123'
      fullName: 'Test User',
      phone: '+1234567890',
      isVerified: true,
    },
  });

  console.log('✅ Test user created:', user.email);

  // Create a test contact
  const contact = await prisma.contact.upsert({
    where: { 
      userId_email: {
        userId: user.id,
        email: 'contact@example.com'
      }
    },
    update: {},
    create: {
      userId: user.id,
      email: 'contact@example.com',
      fullName: 'Test Contact',
      phone: '+0987654321',
      relationship: 'friend',
      isVerified: true,
    },
  });

  console.log('✅ Test contact created:', contact.email);

  // Create a test vault
  const vault = await prisma.vault.upsert({
    where: { id: 'test-vault-id' },
    update: {},
    create: {
      id: 'test-vault-id',
      userId: user.id,
      name: 'Test Vault',
      description: 'A test vault for development',
      isActive: true,
      deadmanTrigger: 30,
      encryptionKey: 'test-encryption-key',
    },
  });

  console.log('✅ Test vault created:', vault.name);

  // Create a test vault entry
  const entry = await prisma.vaultEntry.upsert({
    where: { id: 'test-entry-id' },
    update: {},
    create: {
      id: 'test-entry-id',
      vaultId: vault.id,
      type: 'text',
      content: 'This is a test message',
      timestamp: new Date(),
    },
  });

  console.log('✅ Test vault entry created:', entry.id);

  // Create a test vault recipient
  const recipient = await prisma.vaultRecipient.upsert({
    where: {
      vaultId_contactId: {
        vaultId: vault.id,
        contactId: contact.id,
      }
    },
    update: {},
    create: {
      vaultId: vault.id,
      contactId: contact.id,
      role: 'recipient',
    },
  });

  console.log('✅ Test vault recipient created:', recipient.id);

  // Create a test notification
  const notification = await prisma.notification.upsert({
    where: { id: 'test-notification-id' },
    update: {},
    create: {
      id: 'test-notification-id',
      userId: user.id,
      type: 'email',
      title: 'Welcome to EverKeep',
      message: 'Your account has been created successfully!',
      isRead: false,
      metadata: { category: 'welcome' },
    },
  });

  console.log('✅ Test notification created:', notification.id);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📋 Test data created:');
  console.log(`- User: ${user.email}`);
  console.log(`- Contact: ${contact.email}`);
  console.log(`- Vault: ${vault.name}`);
  console.log(`- Entry: ${entry.id}`);
  console.log(`- Recipient: ${recipient.id}`);
  console.log(`- Notification: ${notification.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 