import { Response } from 'express';
import { prisma } from '@rainfall/database';
import { AuthenticatedRequest } from '../middleware/auth';

export class PlaylistController {
  public static async getUserPlaylists(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const playlists = await prisma.playlist.findMany({
        where: { userId },
        include: { tracks: { orderBy: { position: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ playlists });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to fetch playlists', message: (err as Error).message });
    }
  }

  public static async createPlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) return;

    const { name, description, isPublic } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Playlist name is required' });
      return;
    }

    try {
      const playlist = await prisma.playlist.create({
        data: {
          userId,
          name,
          description,
          isPublic: isPublic ?? false,
        },
      });
      res.json({ success: true, playlist });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to create playlist', message: (err as Error).message });
    }
  }

  public static async deletePlaylist(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { id } = req.params;

    try {
      const existing = await prisma.playlist.findFirst({ where: { id, userId } });
      if (!existing) {
        res.status(404).json({ error: 'Playlist not found or unauthorized' });
        return;
      }

      await prisma.playlist.delete({ where: { id } });
      res.json({ success: true, deletedId: id });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to delete playlist', message: (err as Error).message });
    }
  }
}

