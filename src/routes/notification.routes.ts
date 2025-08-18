import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { getNotificationsQueryDto, createNotificationDto, countQueryDto } from '../dto/notification.dto';
import { listNotifications, createNotification, deleteNotification, getUnreadCount } from '../controllers/notification.controller';

const router = Router();

router.get('/', authMiddleware, validate(getNotificationsQueryDto), listNotifications);
router.post('/', authMiddleware, validate(createNotificationDto), createNotification);
router.delete('/:id', authMiddleware, deleteNotification);
router.get('/count/:user_id', authMiddleware, getUnreadCount);

export default router; 