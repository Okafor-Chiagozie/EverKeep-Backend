import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../config/database';

const toApi = (n: any) => ({
  id: n.id,
  user_id: n.userId,
  title: n.title,
  content: n.content,
  timestamp: n.timestamp,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { pageSize = 10, pageNumber = 1, user_id, title, content } = req.query as any;
  const take = Number(pageSize);
  const skip = (Number(pageNumber) - 1) * take;

  const where: any = { deletedAt: null };
  if (user_id) where.userId = user_id;
  if (title) where.title = { contains: title, mode: 'insensitive' };
  if (content) where.content = { contains: content, mode: 'insensitive' };

  const [rows, totalCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Notifications retrieved successfully',
    data: rows.map(toApi),
    totalCount,
    totalPages: Math.ceil(totalCount / take),
    timestamp: new Date().toISOString(),
  });
});

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, title, content } = req.body as { user_id: string; title: string; content: string };
  const n = await prisma.notification.create({ data: { userId: user_id, type: 'email', title, message: content } });
  res.status(201).json({ success: true, message: 'Notification created successfully', data: toApi(n), timestamp: new Date().toISOString() });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await prisma.notification.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(200).json({ success: true, message: 'Notification deleted successfully', data: null, timestamp: new Date().toISOString() });
});

export const notificationCount = asyncHandler(async (req: Request, res: Response) => {
  const { user_id } = req.query as any;
  const count = await prisma.notification.count({ where: { userId: user_id, deletedAt: null } });
  res.status(200).json({ success: true, message: 'Notification count retrieved successfully', data: count, timestamp: new Date().toISOString() });
}); 