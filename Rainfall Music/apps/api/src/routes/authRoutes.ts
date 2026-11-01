import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/login', AuthController.getLoginUrl);
router.post('/callback', AuthController.handleCallback);
router.get('/me', requireAuth, AuthController.getMe);

export default router;

