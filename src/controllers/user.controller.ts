import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { userRepository } from '../repositories/user.repository';
import { ActivityLogger } from '../services/activityLogger';

const toApi = (u: any) => {
  const doc = u._doc || u;
  return {
    id: doc._id?.toString() || doc._id,
    email: doc.email,
    phone: doc.phone,
    is_verified: doc.isVerified,
    full_name: doc.fullName,
    last_login: doc.lastLogin,
    inactivity_threshold_days: doc.inactivityThresholdDays,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
};

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const user = await userRepository.findById(id);
  if (!user) throw new AppError('User not found', 404);
  res.status(200).json({ success: true, message: 'User retrieved successfully', data: toApi(user), created_at: new Date().toISOString() });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { full_name, phone, inactivity_threshold_days } = req.body as {
    full_name?: string;
    phone?: string;
    inactivity_threshold_days?: number;
  };

  const existing = await userRepository.findById(id);
  if (!existing) throw new AppError('User not found', 404);

  const updateData: any = {};
  const updatedFields: string[] = [];
  
  if (typeof full_name === 'string') {
    updateData.fullName = full_name;
    updatedFields.push('full name');
  }
  if (typeof phone === 'string') {
    updateData.phone = phone;
    updatedFields.push('phone number');
  }
  if (typeof inactivity_threshold_days === 'number') {
    updateData.inactivityThresholdDays = inactivity_threshold_days;
    updatedFields.push('inactivity threshold');
  }

  const updated = await userRepository.update(id, updateData);

  // Log the settings update if any fields were changed
  if (updatedFields.length > 0) {
    try {
      await ActivityLogger.logUserSettingsUpdated(id, updatedFields);
    } catch (error) {
      console.error('Failed to log settings update:', error);
      // Don't fail the update if logging fails
    }
  }

  res.status(200).json({ success: true, message: 'User updated successfully', data: toApi(updated), created_at: new Date().toISOString() });
}); 