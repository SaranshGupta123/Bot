import { Router } from 'express';
import { PlaylistController } from '../controllers/playlistController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/', PlaylistController.getUserPlaylists);
router.post('/', PlaylistController.createPlaylist);
router.delete('/:id', PlaylistController.deletePlaylist);

export default router;

