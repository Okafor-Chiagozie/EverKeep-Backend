import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';

export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    data: { status: 'ok', uptime: process.uptime() },
    created_at: new Date().toISOString(),
  });
});

export const healthCheckDetailed = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Detailed health check',
    data: {
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
    },
    created_at: new Date().toISOString(),
  });
});
