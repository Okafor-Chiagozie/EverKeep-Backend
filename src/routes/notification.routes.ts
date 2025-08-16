import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { getNotificationsQueryDto, createNotificationDto, countQueryDto } from '../dto/notification.dto';
import { listNotifications, createNotification, deleteNotification, getUserNotificationCount } from '../controllers/notification.controller';

const router = Router();

router.get('/', authMiddleware, validate(getNotificationsQueryDto), listNotifications);
router.post('/', authMiddleware, validate(createNotificationDto), createNotification);
router.delete('/:id', authMiddleware, deleteNotification);
router.get('/count', authMiddleware, validate(countQueryDto), getUserNotificationCount);

export default router; 