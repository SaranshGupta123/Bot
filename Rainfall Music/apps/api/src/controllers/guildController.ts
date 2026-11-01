import { Response } from 'express';
import { prisma } from '@rainfall/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { config } from '@rainfall/config';

export class GuildController {
  public static async getUserGuilds(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || !req.user.guilds) {
      res.json({ guilds: [] });
      return;
    }

    res.json({ guilds: req.user.guilds });
  }

  public static async getGuildConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { guildId } = req.params;

    // Verify user authorization for this guild
    const isAllowed = req.user?.guilds?.some((g) => g.id === guildId) || config.DEVELOPER_USER_IDS.includes(req.user?.id || '');
    if (!isAllowed) {
      res.status(403).json({ error: 'Forbidden: You do not manage this guild' });
      return;
    }

    try {
      let cfg = await prisma.guildConfig.findUnique({ where: { guildId } });
      if (!cfg) {
        cfg = await prisma.guildConfig.create({
          data: {
            guildId,
            prefix: config.DISCORD_DEFAULT_PREFIX,
            defaultVolume: 100,
            allowedChannelIds: [],
            twentyFourSeven: false,
            autoplay: false,
          },
        });
      }
      res.json({ config: cfg });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to retrieve guild config', message: (err as Error).message });
    }
  }

  public static async updateGuildConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { guildId } = req.params;
    const isAllowed = req.user?.guilds?.some((g) => g.id === guildId) || config.DEVELOPER_USER_IDS.includes(req.user?.id || '');
    if (!isAllowed) {
      res.status(403).json({ error: 'Forbidden: You do not manage this guild' });
      return;
    }

    const { prefix, defaultVolume, djRoleId, allowedChannelIds, twentyFourSeven, autoplay, voteSkipEnabled, voteSkipThreshold } = req.body;

    try {
      const updated = await prisma.guildConfig.upsert({
        where: { guildId },
        update: {
          prefix,
          defaultVolume,
          djRoleId,
          allowedChannelIds,
          twentyFourSeven,
          autoplay,
          voteSkipEnabled,
          voteSkipThreshold,
        },
        create: {
          guildId,
          prefix: prefix || config.DISCORD_DEFAULT_PREFIX,
          defaultVolume: defaultVolume ?? 100,
          djRoleId,
          allowedChannelIds: allowedChannelIds || [],
          twentyFourSeven: twentyFourSeven ?? false,
          autoplay: autoplay ?? false,
          voteSkipEnabled: voteSkipEnabled ?? true,
          voteSkipThreshold: voteSkipThreshold ?? 50,
        },
      });

      res.json({ success: true, config: updated });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to update guild config', message: (err as Error).message });
    }
  }
}

