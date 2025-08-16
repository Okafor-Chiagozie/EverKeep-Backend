#!/usr/bin/env node

/**
 * MongoDB Migration Script
 * 
 * This script helps migrate from PostgreSQL to MongoDB
 * Run this after setting up your MongoDB connection
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting MongoDB Migration...\n');

try {
  // Step 1: Generate Prisma client
  console.log('📦 Step 1: Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully\n');

  // Step 2: Push schema to MongoDB
  console.log('🗄️ Step 2: Pushing schema to MongoDB...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Schema pushed to MongoDB successfully\n');

  // Step 3: Verify connection
  console.log('🔍 Step 3: Verifying database connection...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
  console.log('✅ Database connection verified\n');

  console.log('🎉 Migration completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Update your environment variables');
  console.log('2. Test your API endpoints');
  console.log('3. Deploy to Render with MongoDB connection string');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Check your DATABASE_URL in .env file');
  console.log('2. Ensure MongoDB is running and accessible');
  console.log('3. Verify your MongoDB connection string format');
  console.log('4. Check Prisma schema for any validation errors');
  process.exit(1);
} 