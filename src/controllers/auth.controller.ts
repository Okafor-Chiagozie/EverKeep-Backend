import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { ActivityLogger } from '../services/activityLogger';

const signToken = (userId: string, email: string) => {
  const secret: Secret = (env?.JWT_SECRET || '') as unknown as Secret;
  const options: SignOptions = { expiresIn: (env?.JWT_EXPIRES_IN || '7d') as unknown as any };
  return jwt.sign({ userId, email }, secret, options);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body as {
    email: string; password: string; fullName?: string; phone?: string;
  };

  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
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
        isVerified: false // Default to false for new registrations
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
      message: 'Registration successful. Please verify your email.',
      data: { user, token: jwtToken },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // Handle unique constraint violations for email gracefully
    if (err.code === 'P2002' && err.meta?.target?.includes('email')) {
      throw new AppError('User with this email already exists', 409);
    }
    throw err;
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  // Debug logging
  console.log('🔍 Login attempt:');
  console.log('  Email received:', `"${email}"`);
  console.log('  Password received:', `"${password}"`);
  console.log('  Email length:', email?.length);
  console.log('  Password length:', password?.length);

  const existing = await prisma.user.findFirst({
    where: { 
      email
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      password: true,
      isVerified: true,
    },
  });

  console.log('  User found:', !!existing);
  if (existing) {
    console.log('  User email in DB:', `"${existing.email}"`);
    console.log('  User verified:', existing.isVerified);
  }

  if (!existing) {
    console.log('  ❌ No user found with this email');
    throw new AppError('Invalid credentials', 401);
  }

  const match = await bcrypt.compare(password, existing.password);
  console.log('  Password match:', match);

  if (!match) {
    console.log('  ❌ Password does not match');
    throw new AppError('Invalid credentials', 401);
  }

  console.log('  ✅ Login successful');

  await prisma.user.update({ where: { id: existing.id }, data: { lastLogin: new Date() } });

  const token = signToken(existing.id, existing.email);

  // Log login with metadata
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || undefined;
  const ua = req.headers['user-agent'];
  ActivityLogger.logLogin(existing.id, { ip, ua: typeof ua === 'string' ? ua : undefined });

  const { password: _pw, ...user } = existing;

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, token },
    timestamp: new Date().toISOString(),
  });
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError('Unauthorized', 401);
  }

  const existing = await prisma.user.findFirst({
    where: { id: req.user.userId },
    select: { id: true, email: true, fullName: true, phone: true, isVerified: true, createdAt: true, updatedAt: true },
  });

  if (!existing) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: existing,
    timestamp: new Date().toISOString(),
  });
});

export const logout = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful',
    data: null,
    timestamp: new Date().toISOString(),
  });
});

export const requestEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  // For now, just mark as verified since we don't have email verification tokens
  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });

  res.status(200).json({ 
    success: true, 
    message: 'Email verification completed', 
    data: null, 
    timestamp: new Date().toISOString() 
  });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) throw new AppError('User not found', 404);

  await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });

  // Log email verified
  ActivityLogger.logEmailVerified(user.id);

  res.status(200).json({ success: true, message: 'Email verified', data: null, timestamp: new Date().toISOString() });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) throw new AppError('User not found', 404);

  // For now, just return success since we don't have password reset tokens
  // In production, you'd implement actual email sending
  res.status(200).json({ 
    success: true, 
    message: 'Password reset email sent (if email service configured)', 
    data: null, 
    timestamp: new Date().toISOString() 
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, newPassword } = req.body as { email: string; newPassword: string };
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) throw new AppError('User not found', 404);

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  // Log password updated
  ActivityLogger.logPasswordUpdated(user.id);

  res.status(200).json({ success: true, message: 'Password updated', data: null, timestamp: new Date().toISOString() });
}); 