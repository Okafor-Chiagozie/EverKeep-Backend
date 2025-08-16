import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/appError';

const toApi = (n: any) => ({
  id: n.id,
  user_id: n.userId,
  title: n.title,
  content: n.content,
  timestamp: n.timestamp,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const getNotifications = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  const { pageSize = 10, pageNumber = 1 } = req.query as any;
  const take = Number(pageSize);
  const skip = (Number(pageNumber) - 1) * take;

  // Simplified query for MongoDB - removed deletedAt check
  const where: any = {};

  const [rows, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where: { ...where, userId: user_id },
      skip,
      take,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.notification.count({ where: { ...where, userId: user_id } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: rows,
    totalCount,
    totalPages: Math.ceil(totalCount / take),
    timestamp: new Date().toISOString(),
  });
});

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, title, content } = req.body as { user_id: string; title: string; content: string };
  const n = await prisma.notification.create({ data: { userId: user_id, title, content } });
  res.status(201).json({ success: true, message: 'Notification created successfully', data: toApi(n), timestamp: new Date().toISOString() });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await prisma.notification.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(200).json({ success: true, message: 'Notification deleted successfully', data: null, timestamp: new Date().toISOString() });
});

export const getNotificationCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user_id = req.user?.userId;
  if (!user_id) throw new AppError('Unauthorized', 401);

  // Simplified query for MongoDB - removed deletedAt check
  const count = await prisma.notification.count({ where: { userId: user_id } });

  res.status(200).json({
    success: true,
    message: 'Notification count retrieved successfully',
    data: { count },
    timestamp: new Date().toISOString(),
  });
}); 