import { prisma, GuildConfig, ControlPanel } from '@rainfall/database';
import { redis, createScopedLogger } from '@rainfall/shared';
import { config } from '@rainfall/config';

const log = createScopedLogger('DatabaseService');

export class DatabaseService {
  private configMemoryCache = new Map<string, { data: GuildConfig; expires: number }>();
  private CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

  /**
   * Ensure parent Guild record exists in PostgreSQL before referencing foreign keys
   */
  public async ensureGuild(
    guildId: string,
    name = 'Discord Server',
    ownerId = 'unknown'
  ): Promise<void> {
    try {
      await prisma.guild.upsert({
        where: { id: guildId },
        update: {
          name: name !== 'Discord Server' ? name : undefined,
          ownerId: ownerId !== 'unknown' ? ownerId : undefined,
          updatedAt: new Date(),
        },
        create: {
          id: guildId,
          name,
          ownerId,
        },
      });
    } catch (err: unknown) {
      log.warn(`Could not ensure guild record in database for ${guildId}: ${(err as Error).message}`);
    }
  }

  /**
   * Ensure parent User record exists in PostgreSQL before referencing foreign keys
   */
  public async ensureUser(
    userId: string,
    username = 'Discord User'
  ): Promise<void> {
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {
          username: username !== 'Discord User' ? username : undefined,
          updatedAt: new Date(),
        },
        create: {
          id: userId,
          username,
        },
      });
    } catch (err: unknown) {
      log.warn(`Could not ensure user record in database for ${userId}: ${(err as Error).message}`);
    }
  }

  public async getGuildConfig(guildId: string): Promise<GuildConfig> {
    const cached = this.configMemoryCache.get(guildId);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    try {
      // 1. Ensure parent Guild record exists first
      await this.ensureGuild(guildId);

      let cfg = await prisma.guildConfig.findUnique({
        where: { guildId },
      });

      if (!cfg) {
        cfg = await prisma.guildConfig.create({
          data: {
            guildId,
            prefix: config.DISCORD_DEFAULT_PREFIX,
            defaultVolume: 100,
            allowedChannelIds: [],
            twentyFourSeven: false,
            autoplay: false,
            voteSkipEnabled: true,
            voteSkipThreshold: 50,
            noPrefix: true,
            noPrefixUserIds: [],
          },
        });
      }

      this.configMemoryCache.set(guildId, {
        data: cfg,
        expires: Date.now() + this.CACHE_TTL_MS,
      });

      return cfg;
    } catch (err: unknown) {
      log.warn(`Database unreachable, returning default in-memory configuration for guild ${guildId}: ${(err as Error).message}`);
      const fallback: GuildConfig = {
        guildId,
        prefix: config.DISCORD_DEFAULT_PREFIX,
        defaultVolume: 100,
        djRoleId: null,
        allowedChannelIds: [],
        twentyFourSeven: false,
        autoplay: false,
        voteSkipEnabled: true,
        voteSkipThreshold: 50,
        maxQueueSize: 1000,
        announcements: true,
        noPrefix: true,
        noPrefixUserIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.configMemoryCache.set(guildId, {
        data: fallback,
        expires: Date.now() + this.CACHE_TTL_MS,
      });
      return fallback;
    }
  }

  public async updateGuildConfig(
    guildId: string,
    data: Partial<Omit<GuildConfig, 'guildId' | 'createdAt' | 'updatedAt'>>
  ): Promise<GuildConfig> {
    try {
      // 1. Ensure the parent Guild record exists before upserting GuildConfig
      await this.ensureGuild(guildId);

      const updated = await prisma.guildConfig.upsert({
        where: { guildId },
        update: data,
        create: {
          guildId,
          prefix: data.prefix || config.DISCORD_DEFAULT_PREFIX,
          defaultVolume: data.defaultVolume ?? 100,
          djRoleId: data.djRoleId ?? null,
          allowedChannelIds: data.allowedChannelIds ?? [],
          twentyFourSeven: data.twentyFourSeven ?? false,
          autoplay: data.autoplay ?? false,
          voteSkipEnabled: data.voteSkipEnabled ?? true,
          voteSkipThreshold: data.voteSkipThreshold ?? 50,
          noPrefix: data.noPrefix ?? true,
          noPrefixUserIds: data.noPrefixUserIds ?? [],
        },
      });

      this.configMemoryCache.set(guildId, {
        data: updated,
        expires: Date.now() + this.CACHE_TTL_MS,
      });

      // Also persist to Redis asynchronously without blocking response
      redis.set(`guild_config:${guildId}`, JSON.stringify(updated), 'EX', 86400).catch(() => {});

      return updated;
    } catch (err: unknown) {
      log.error(`Failed to update guild config in database for ${guildId}, falling back to memory/Redis: ${(err as Error).message}`);

      // Graceful fallback: maintain state in memory cache and Redis so commands NEVER crash!
      const existing = (await this.getGuildConfig(guildId)) || {
        guildId,
        prefix: config.DISCORD_DEFAULT_PREFIX,
        defaultVolume: 100,
        djRoleId: null,
        allowedChannelIds: [],
        twentyFourSeven: false,
        autoplay: false,
        voteSkipEnabled: true,
        voteSkipThreshold: 50,
        maxQueueSize: 1000,
        announcements: true,
        noPrefix: true,
        noPrefixUserIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const fallback: GuildConfig = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };

      this.configMemoryCache.set(guildId, {
        data: fallback,
        expires: Date.now() + this.CACHE_TTL_MS,
      });

      redis.set(`guild_config:${guildId}`, JSON.stringify(fallback), 'EX', 86400).catch(() => {});
      return fallback;
    }
  }

  public async saveControlPanel(
    guildId: string,
    channelId: string,
    messageId: string,
    voiceChannelId: string
  ): Promise<void> {
    try {
      await this.ensureGuild(guildId);

      await prisma.controlPanel.upsert({
        where: { guildId },
        update: {
          channelId,
          messageId,
          voiceChannelId,
          lastActive: new Date(),
        },
        create: {
          guildId,
          channelId,
          messageId,
          voiceChannelId,
        },
      });

      // Also cache in Redis asynchronously
      redis.set(`control_panel:${guildId}`, JSON.stringify({ channelId, messageId, voiceChannelId }), 'EX', 86400).catch(() => {});
    } catch (err: unknown) {
      log.warn(`Could not persist control panel metadata to database: ${(err as Error).message}`);
    }
  }

  public async getControlPanel(guildId: string): Promise<ControlPanel | null> {
    try {
      const cached = await redis.get(`control_panel:${guildId}`).catch(() => null);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          guildId,
          channelId: parsed.channelId,
          messageId: parsed.messageId,
          voiceChannelId: parsed.voiceChannelId,
          lastActive: new Date(),
          updatedAt: new Date(),
        };
      }

      return await prisma.controlPanel.findUnique({
        where: { guildId },
      });
    } catch {
      return null;
    }
  }

  public async deleteControlPanel(guildId: string): Promise<void> {
    try {
      await redis.del(`control_panel:${guildId}`).catch(() => {});
      await prisma.controlPanel.deleteMany({ where: { guildId } });
    } catch (err: unknown) {
      log.warn(`Could not remove control panel record: ${(err as Error).message}`);
    }
  }

  public async logAudit(
    action: string,
    guildId?: string,
    userId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      if (guildId) await this.ensureGuild(guildId);
      if (userId) await this.ensureUser(userId);

      await prisma.auditLog.create({
        data: {
          action,
          guildId,
          userId,
          details: details as any,
        },
      });
    } catch {
      // Audit logging should never interrupt user workflows
    }
  }
}
