import { z } from 'zod';

export const createUserDto = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(1, 'Full name is required'),
    phone: z.string().optional(),
  }),
});

export const updateUserDto = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  }),
  body: z.object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    inactivity_threshold_days: z.number().min(1).max(365).optional(),
  }),
});

export const getUserDto = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'), // MongoDB ObjectId format
  }),
});

export type CreateUserDto = z.infer<typeof createUserDto>;
export type UpdateUserDto = z.infer<typeof updateUserDto>;
export type GetUserDto = z.infer<typeof getUserDto>;