import { z } from 'zod';

export const loginDto = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const registerDto = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().optional(),
    phone: z.string().optional(),
  }),
});

export const requestEmailVerificationDto = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const verifyEmailDto = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const requestPasswordResetDto = z.object({
  body: z.object({ email: z.string().email() }),
});

export const resetPasswordDto = z.object({
  body: z.object({ 
    email: z.string().email(), 
    newPassword: z.string().min(8) 
  }),
});

export type LoginDto = z.infer<typeof loginDto>;
export type RegisterDto = z.infer<typeof registerDto>;
export type RequestEmailVerificationDto = z.infer<typeof requestEmailVerificationDto>;
export type VerifyEmailDto = z.infer<typeof verifyEmailDto>;
export type RequestPasswordResetDto = z.infer<typeof requestPasswordResetDto>;
export type ResetPasswordDto = z.infer<typeof resetPasswordDto>;