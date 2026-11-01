import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/favorites', UserController.getFavorites);
router.get('/history', UserController.getHistory);
router.get('/profile', UserController.getProfile);

export default router;

