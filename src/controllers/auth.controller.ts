import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { ActivityLogger } from '../services/activityLogger';

const toApi = (u: any) => ({
  id: u.id,
  email: u.email,
  phone: u.phone,
  is_verified: u.isVerified,
  full_name: u.fullName,
  last_login: u.lastLogin,
  created_at: u.createdAt,
  updated_at: u.updatedAt,
});

const signToken = (userId: string, email: string) => {
  const secret: Secret = (env?.JWT_SECRET || '') as unknown as Secret;
  const options: SignOptions = { expiresIn: (env?.JWT_EXPIRES_IN || '7d') as unknown as any };
  return jwt.sign({ userId, email }, secret, options);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body as {
    email: string; password: string; fullName?: string; phone?: string;
  };

  const existing = await prisma.user.findFirst({ where: { email, isDeleted: false } });
  if (existing) {
    throw new AppError('User with this email already exists', 409);
  }

  const hashed = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashed, 
        fullName: fullName || null, 
        phone: phone || null,
        isVerified: true // Set to true by default - no email verification needed
      },
      select: { 
        id: true, 
        email: true, 
        fullName: true, 
        phone: true, 
        isVerified: true,
        createdAt: true 
      },
    });

    const jwtToken = signToken(user.id, user.email);

    // Log registration
    ActivityLogger.logRegistration(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. You can now log in.',
      data: { user, token: jwtToken },
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    // Handle unique constraint violations for email gracefully
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
      throw new AppError('User with this email already exists', 409);
    }
    throw err;
  }
});

// Test database connection
export const testDb = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    // Test finding a user
    const testUser = await prisma.user.findFirst();
    console.log('Test user found:', !!testUser);
    
    // Test contact count
    const contactCount = await prisma.contact.count();
    console.log('Contact count:', contactCount);
    
    // Test notification count
    const notificationCount = await prisma.notification.count();
    console.log('Notification count:', notificationCount);
    
    res.status(200).json({
      success: true,
      message: 'Database connection test successful',
      data: { 
        userCount,
        testUserFound: !!testUser,
        contactCount,
        notificationCount,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('❌ Database test error:', err);
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      data: null,
      error: err.message,
      stack: err.stack,
      created_at: new Date().toISOString(),
    });
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  console.log('🔍 Login attempt for:', email);

  try {
    // Simple user check first
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), isDeleted: false },
    });

    console.log('User found:', !!existing);
    console.log('User data:', existing ? { id: existing.id, email: existing.email, isVerified: existing.isVerified } : 'none');

    if (!existing) {
      console.log('❌ No user found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
        created_at: new Date().toISOString(),
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, existing.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        data: null,
        created_at: new Date().toISOString(),
      });
    }

    // Generate simple token
    const token = jwt.sign(
      { userId: existing.id, email: existing.email },
      env?.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful');

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { 
        user: toApi(existing), 
        token 
      },
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('❌ Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      data: null,
      created_at: new Date().toISOString(),
    });
  }
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const existing = await prisma.user.findFirst({
    where: { id: req.user.userId, isDeleted: false },
    select: { id: true, email: true, fullName: true, phone: true, isVerified: true, createdAt: true, updatedAt: true },
  });

  if (!existing) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: toApi(existing),
    created_at: new Date().toISOString(),
  });
});

export const logout = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful',
    data: null,
    created_at: new Date().toISOString(),
  });
});

export const requestEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isDeleted: false },
    select: { id: true, email: true, fullName: true, isVerified: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // In a real app, you would send an email with a verification link
  // For now, just mark as verified
  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });

  res.status(200).json({
    success: true,
    message: 'Email verified',
    data: null,
    created_at: new Date().toISOString(),
  });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isDeleted: false },
    select: { id: true, email: true, fullName: true, isVerified: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // In a real app, you would verify the token from the email
  // For now, just mark as verified
  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });

  res.status(200).json({
    success: true,
    message: 'Email verified',
    data: null,
    created_at: new Date().toISOString(),
  });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isDeleted: false },
    select: { id: true, email: true, fullName: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // In a real app, you would send an email with a reset link
  // For now, just return success
  res.status(200).json({
    success: true,
    message: 'Password reset email sent',
    data: null,
    created_at: new Date().toISOString(),
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, newPassword } = req.body as { email: string; newPassword: string };

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim(), isDeleted: false },
    select: { id: true, email: true, fullName: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // In a real app, you would verify the token from the email
  // For now, just update the password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });

  res.status(200).json({
    success: true,
    message: 'Password updated',
    data: null,
    created_at: new Date().toISOString(),
  });
}); 