import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../config/database';

const toApi = (n: any) => ({
  id: n.id,
  user_id: n.userId,
  title: n.title,
  content: n.message,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('🔍 listNotifications called with query:', req.query);
    
    // Test database connection first
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
    } catch (dbError: any) {
      console.error('❌ Database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        data: null,
        error: dbError.message,
        created_at: new Date().toISOString(),
      });
    }
    
    const { pageSize = '10', pageNumber = '1', user_id, title, message, search } = req.query as any;
    
    // Convert string parameters to integers
    const pageSizeInt = parseInt(pageSize as string, 10);
    const pageNumberInt = parseInt(pageNumber as string, 10);
    
    const where: any = { isDeleted: false };
    
    if (user_id) where.userId = user_id;
    if (title) where.title = { contains: title, mode: 'insensitive' };
    if (message) where.message = { contains: message, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    console.log('🔍 Where clause:', JSON.stringify(where, null, 2));
    console.log('🔍 Pagination:', { pageSizeInt, pageNumberInt, skip: (pageNumberInt - 1) * pageSizeInt, take: pageSizeInt });

    const [rows, count] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNumberInt - 1) * pageSizeInt,
        take: pageSizeInt,
      }),
      prisma.notification.count({ where }),
    ]);

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

export const createNotification = asyncHandler(async (req: Request, res: Response) => {
  const { user_id, title, message } = req.body as { user_id: string; title: string; message: string };
  const n = await prisma.notification.create({ data: { userId: user_id, type: 'email', title, message } });
  res.status(201).json({ success: true, message: 'Notification created successfully', data: toApi(n), created_at: new Date().toISOString() });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await prisma.notification.update({ where: { id }, data: { isDeleted: true } });
  res.status(200).json({ success: true, message: 'Notification deleted successfully', data: null, created_at: new Date().toISOString() });
});

export const getUserNotificationCount = asyncHandler(async (req: Request, res: Response) => {
  const { user_id } = req.query as { user_id: string };
  const count = await prisma.notification.count({ where: { userId: user_id, isDeleted: false } });
  res.status(200).json({ success: true, message: 'Notification count retrieved successfully', data: count, created_at: new Date().toISOString() });
}); 