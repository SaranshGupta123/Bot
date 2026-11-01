import { Request, Response } from 'express';
import { prisma } from '@rainfall/database';
import { redis } from '@rainfall/shared';

export class AdminController {
  public static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const [guildCount, userCount, playlistCount, auditLogs] = await Promise.all([
        prisma.guild.count(),
        prisma.user.count(),
        prisma.playlist.count(),
        prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
      ]);

      const maintenance = (await redis.get('system:maintenance_mode')) === 'true';

      res.json({
        metrics: {
          guildCount,
          userCount,
          playlistCount,
          maintenance,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          nodeVersion: process.version,
        },
        auditLogs,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to retrieve system metrics', message: (err as Error).message });
    }
  }

  public static async toggleMaintenance(req: Request, res: Response): Promise<void> {
    const { enabled } = req.body;
    try {
      await redis.set('system:maintenance_mode', enabled ? 'true' : 'false');
      res.json({ success: true, maintenance: enabled });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to toggle maintenance mode', message: (err as Error).message });
    }
  }
}

