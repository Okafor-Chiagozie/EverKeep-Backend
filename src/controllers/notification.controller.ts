import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { ActivityLogger } from '../services/activityLogger';
import { notificationRepository } from '../repositories';

const toApi = (n: any) => {
  const doc = n._doc || n;
  return {
    id: doc._id?.toString() || doc._id,
    user_id: doc.userId?.toString() || doc.userId,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    timestamp: doc.createdAt, // Map createdAt to timestamp for frontend
    isRead: doc.isRead,
    metadata: doc.metadata,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
};

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 listNotifications called with query:', req.query);
    
    const { pageSize = '10', pageNumber = '1', user_id, type, isRead } = req.query as any;
    
    // Convert string parameters to integers
    const pageSizeInt = parseInt(pageSize as string, 10);
    const pageNumberInt = parseInt(pageNumber as string, 10);
    
    // For now, we'll implement basic filtering
    // TODO: Implement more advanced filtering with Mongoose
    const skip = (pageNumberInt - 1) * pageSizeInt;
    const take = pageSizeInt;

    console.log('🔍 Pagination:', { pageSizeInt, pageNumberInt, skip, take });

    // Get notifications for the user if user_id is provided
    let rows: any[] = [];
    let count = 0;
    
    if (user_id) {
      rows = await notificationRepository.findAll(user_id, skip, take);
      count = await notificationRepository.count(user_id);
    }

    console.log('✅ Found notifications:', rows.length, 'Total count:', count);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: rows.map(toApi),
      totalCount: count,
      totalPages: Math.ceil(count / pageSizeInt),
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error in listNotifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      data: null,
      error: error.message,
      created_at: new Date().toISOString(),
    });
  }
});

export const getNotificationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const notification = await notificationRepository.findById(id);
  if (!notification) throw new AppError('Notification not found', 404);
  res.status(200).json({ success: true, message: 'Notification retrieved successfully', data: toApi(notification), created_at: new Date().toISOString() });
});

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, type, title, message } = req.body as { user_id: string; type: string; title: string; message: string };

  const notification = await notificationRepository.create({
    userId: new mongoose.Types.ObjectId(user_id),
    type,
    title,
    message,
  });

  res.status(201).json({
    success: true,
    message: 'Notification created successfully',
    data: toApi(notification),
    created_at: new Date().toISOString(),
  });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await notificationRepository.delete(id);

  res.status(200).json({ success: true, message: 'Notification deleted successfully', data: null, created_at: new Date().toISOString() });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const { user_id } = req.params as { user_id: string };
  const count = await notificationRepository.countUnread(user_id);

  res.status(200).json({ success: true, message: 'Unread count retrieved successfully', data: { count }, created_at: new Date().toISOString() });
}); 