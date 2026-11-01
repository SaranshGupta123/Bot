import { Router } from 'express';
import { PlayerController } from '../controllers/playerController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/:guildId', PlayerController.getPlayerState);
router.post('/:guildId/action', PlayerController.executeAction);

export default router;

