-- MongoDB Migration: Convert from PostgreSQL to MongoDB with soft delete
-- This migration will be handled by Prisma's MongoDB provider

-- Note: MongoDB doesn't use SQL migrations like PostgreSQL
-- Prisma will handle the schema changes automatically when you run:
-- npx prisma db push

-- The schema includes:
-- 1. MongoDB ObjectId primary keys
-- 2. Soft delete with deletedAt columns
-- 3. Proper relations between models
-- 4. Collection mapping for MongoDB 