import { Response } from 'express';
import { prisma } from '@rainfall/database';
import { AuthenticatedRequest } from '../middleware/auth';

export class UserController {
  public static async getFavorites(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) return;

    try {
      const favorites = await prisma.favoriteTrack.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ favorites });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to fetch favorites', message: (err as Error).message });
    }
  }

  public static async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) return;

    try {
      const history = await prisma.listeningHistory.findMany({
        where: { userId },
        orderBy: { playedAt: 'desc' },
        take: 50,
      });
      res.json({ history });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to fetch listening history', message: (err as Error).message });
    }
  }

  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) return;

    try {
      const [user, favoritesCount, playlistsCount, historyCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: { preferences: true },
        }),
        prisma.favoriteTrack.count({ where: { userId } }),
        prisma.playlist.count({ where: { userId } }),
        prisma.listeningHistory.count({ where: { userId } }),
      ]);

      res.json({
        user,
        stats: {
          favoritesCount,
          playlistsCount,
          historyCount,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to fetch user profile', message: (err as Error).message });
    }
  }
}

