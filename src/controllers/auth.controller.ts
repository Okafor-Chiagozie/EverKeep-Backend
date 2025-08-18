import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { ActivityLogger } from '../services/activityLogger';
import { userRepository } from '../repositories';

const toApi = (u: any) => {
  const doc = u._doc || u;
  return {
    id: doc._id?.toString() || doc._id,
    email: doc.email,
    phone: doc.phone,
    is_verified: doc.isVerified,
    full_name: doc.fullName,
    last_login: doc.lastLogin,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
};

const signToken = (userId: string, email: string) => {
  const secret: Secret = (env?.JWT_SECRET || '') as unknown as Secret;
  const options: SignOptions = { expiresIn: (env?.JWT_EXPIRES_IN || '7d') as unknown as any };
  return jwt.sign({ userId, email }, secret, options);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, fullName, phone } = req.body as {
    email: string; password: string; fullName?: string; phone?: string;
  };

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError('User with this email already exists', 409);
  }

  const hashed = await bcrypt.hash(password, 12);

  try {
    const user = await userRepository.create({
      email, 
      hashedPassword: hashed, 
      fullName: fullName || null, 
      phone: phone || null,
      lastLogin: new Date(), // Set initial lastLogin
    });

    const jwtToken = signToken(user._id.toString(), user.email);

    // Log registration
    console.log('🔍 Creating registration notification for user:', user._id.toString());
    try {
      await ActivityLogger.logRegistration(user._id.toString());
      console.log('✅ Registration notification created successfully');
    } catch (error) {
      console.error('❌ Failed to create registration notification:', error);
      // Don't fail the registration if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. You can now log in.',
      data: { user: toApi(user), token: jwtToken },
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    // Handle unique constraint violations for email gracefully
    if (err.code === 11000 && err.keyPattern?.email) {
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
    console.log('✅ Database connection successful');
    
    // Test basic query
    const userCount = await userRepository.count();
    console.log('User count:', userCount);
    
    // Test finding a user
    const testUser = await userRepository.findByEmail('admin@everkeep.com');
    console.log('Test user found:', !!testUser);
    
    // Test contact count - we'll need to implement this
    const contactCount = 0; // TODO: implement contact count
    console.log('Contact count:', contactCount);
    
    // Test notification count - we'll need to implement this
    const notificationCount = 0; // TODO: implement notification count
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
    const existing = await userRepository.findByEmail(email.toLowerCase().trim());

    console.log('User found:', !!existing);
    console.log('User data:', existing ? { id: existing._id, email: existing.email, isVerified: existing.isVerified } : 'none');

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

    // Update lastLogin timestamp
    const updatedUser = await userRepository.update(existing._id.toString(), {
      lastLogin: new Date()
    });

    // Generate simple token
    const token = jwt.sign(
      { userId: existing._id.toString(), email: existing.email },
      env?.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Log successful login with IP and user agent info
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log('🔍 Creating login notification for user:', existing._id.toString());
    console.log('🔍 IP Address:', ipAddress);
    console.log('🔍 User Agent:', userAgent);
    
    try {
      await ActivityLogger.logLogin(existing._id.toString(), {
        ip: ipAddress,
        ua: userAgent,
        location: 'unknown' // Could be enhanced with IP geolocation
      });
      console.log('✅ Login notification created successfully');
    } catch (error) {
      console.error('❌ Failed to create login notification:', error);
      // Don't fail the login if notification fails
    }

    console.log('✅ Login successful');

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { 
        user: toApi(updatedUser), 
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

  const existing = await userRepository.findById(req.user.userId);

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

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.userId) {
    throw new AppError('Unauthorized', 401);
  }

  try {
    // Log logout activity
    ActivityLogger.logLogout(req.user.userId, {
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      ua: req.get('User-Agent') || 'unknown',
      location: 'unknown'
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: null,
      created_at: new Date().toISOString(),
    });
  }
});

export const requestEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await userRepository.findByEmail(email.toLowerCase().trim());

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // In a real app, you would send an email with a verification link
  // For now, just mark as verified
  await userRepository.update(user._id.toString(), { isVerified: true });

  res.status(200).json({
    success: true,
    message: 'Email verified',
    data: null,
    created_at: new Date().toISOString(),
  });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await userRepository.findByEmail(email.toLowerCase().trim());

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('Email is already verified', 400);
  }

  // In a real app, you would verify the token from the email
  // For now, just mark as verified
  await userRepository.update(user._id.toString(), { isVerified: true });

  res.status(200).json({
    success: true,
    message: 'Email verified',
    data: null,
    created_at: new Date().toISOString(),
  });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await userRepository.findByEmail(email.toLowerCase().trim());

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

  const user = await userRepository.findByEmail(email.toLowerCase().trim());

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // In a real app, you would verify the token from the email
  // For now, just update the password
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await userRepository.update(user._id.toString(), { password: hashedPassword });

  res.status(200).json({
    success: true,
    message: 'Password updated',
    data: null,
    created_at: new Date().toISOString(),
  });
}); 