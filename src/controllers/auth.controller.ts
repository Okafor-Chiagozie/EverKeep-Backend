import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { ActivityLogger } from '../services/activityLogger';

const signToken = (userId: string, email: string) => {
  const secret: Secret = (env?.JWT_SECRET || '') as unknown as Secret;
  const options: SignOptions = { expiresIn: (env?.JWT_EXPIRES_IN || '7d') as unknown as any };
  return jwt.sign({ userId, email }, secret, options);
};

const generateToken = () => crypto.randomBytes(32).toString('hex');
const addHours = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body as {
    email: string; password: string; fullName: string; phone: string;
  };

  // Simplified query for MongoDB - removed deletedAt check
  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    throw new AppError('User with this email already exists', 409);
  }

  const hashed = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, password: hashed, fullName, phone },
      select: { id: true, email: true, fullName: true, phone: true },
    });

    // Create email verification token
    const token = generateToken();
    await (prisma as any).emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt: addHours(24) },
    });

    const jwtToken = signToken(user.id, user.email);

    // Log registration
    ActivityLogger.logRegistration(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: { user, token: jwtToken, emailVerificationToken: token },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // Handle unique constraint violations for email/phone gracefully
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const fields = (err.meta?.target as string[]) || [];
      if (fields.includes('email')) {
        throw new AppError('User with this email already exists', 409);
      }
      if (fields.includes('phone')) {
        throw new AppError('User with this phone already exists', 409);
      }
      throw new AppError('Duplicate field value', 409);
    }
    throw err;
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  // Simplified query for MongoDB - removed deletedAt check
  const existing = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      password: true,
      isVerified: true,
    },
  });
  
  if (!existing) {
    throw new AppError('Invalid credentials', 401);
  }

  const match = await bcrypt.compare(password, existing.password);
  if (!match) {
    throw new AppError('Invalid credentials', 401);
  }

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

  // Simplified query for MongoDB - removed deletedAt check
  const existing = await prisma.user.findFirst({
    where: { id: req.user.userId },
    select: { id: true, email: true, fullName: true, phone: true, isVerified: true },
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
  // Simplified query for MongoDB - removed deletedAt check
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  const token = generateToken();
  await (prisma as any).emailVerificationToken.create({ data: { userId: user.id, token, expiresAt: addHours(24) } });

  res.status(200).json({ success: true, message: 'Verification email requested', data: { token }, timestamp: new Date().toISOString() });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  const record = await (prisma as any).emailVerificationToken.findFirst({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Invalid or expired token', 400);
  }

  await (prisma as any).$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
    (prisma as any).emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  // Log email verified
  ActivityLogger.logEmailVerified(record.userId);

  res.status(200).json({ success: true, message: 'Email verified', data: null, timestamp: new Date().toISOString() });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  // Simplified query for MongoDB - removed deletedAt check
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  const token = generateToken();
  await (prisma as any).passwordResetToken.create({ data: { userId: user.id, token, expiresAt: addHours(1) } });

  // Log password reset requested
  ActivityLogger.logPasswordResetRequested(user.id);

  res.status(200).json({ success: true, message: 'Password reset requested', data: { token }, timestamp: new Date().toISOString() });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  const record = await (prisma as any).passwordResetToken.findFirst({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Invalid or expired token', 400);
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  await (prisma as any).$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
    (prisma as any).passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  // Log password updated
  ActivityLogger.logPasswordUpdated(record.userId);

  res.status(200).json({ success: true, message: 'Password updated', data: null, timestamp: new Date().toISOString() });
}); 