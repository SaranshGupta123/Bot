import { Router } from 'express';
import { GuildController } from '../controllers/guildController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/', GuildController.getUserGuilds);
router.get('/:guildId/config', GuildController.getGuildConfig);
router.patch('/:guildId/config', GuildController.updateGuildConfig);

export default router;

