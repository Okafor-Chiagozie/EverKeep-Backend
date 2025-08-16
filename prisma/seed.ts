import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      fullName: 'Test User',
      phone: '+1234567890',
      isVerified: true,
    },
  });

  console.log('✅ Test user created:', testUser.email);
  console.log('🔑 Test credentials:');
  console.log('   Email: test@example.com');
  console.log('   Password: password123');

  // Create a test contact
  const testContact = await prisma.contact.upsert({
    where: { 
      userId_email: {
        userId: testUser.id,
        email: 'contact@example.com'
      }
    },
    update: {},
    create: {
      userId: testUser.id,
      name: 'Test Contact',
      email: 'contact@example.com',
      phone: '+1987654321',
      role: 'Family',
      verified: true,
    },
  });

  console.log('✅ Test contact created:', testContact.name);

  // Create a test vault (MongoDB will generate the ID automatically)
  const testVault = await prisma.vault.create({
    data: {
      userId: testUser.id,
      name: 'Test Vault',
      description: 'A test vault for development',
    },
  });

  console.log('✅ Test vault created:', testVault.name);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 