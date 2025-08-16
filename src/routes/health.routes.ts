import { Router } from 'express';
import { healthCheck, healthCheckDetailed } from '../controllers/health.controller';

const router = Router();

router.get('/', healthCheck);
router.get('/detailed', healthCheckDetailed);

export default router;
