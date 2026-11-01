import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/metrics', AdminController.getMetrics);
router.post('/maintenance', AdminController.toggleMaintenance);

export default router;

