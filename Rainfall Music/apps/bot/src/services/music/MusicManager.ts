import {
  LavalinkManager,
  Player,
  SearchResult,
  Track,
} from 'lavalink-client';
import { Client, Guild } from 'discord.js';
import { config } from '@rainfall/config';
import { createScopedLogger } from '@rainfall/shared';
import { LoopMode, AudioFilter } from '@rainfall/types';
import { AutoplayService } from './AutoplayService';
import type { RainfallClient } from '../../client/RainfallClient';

const log = createScopedLogger('MusicManager');

export class MusicManager {
  public lavalink: LavalinkManager;
  public autoplayService: AutoplayService;
  private guildMutexes = new Map<string, Promise<any>>();

  constructor(public client: RainfallClient) {
    this.autoplayService = new AutoplayService(this);

    const nodes = [
      {
        id: config.LAVALINK_NODE_1_ID,
        host: config.LAVALINK_NODE_1_HOST,
        port: config.LAVALINK_NODE_1_PORT,
        authorization: config.LAVALINK_NODE_1_PASSWORD,
        secure: config.LAVALINK_NODE_1_SECURE,
        retryAmount: 100,
        retryDelay: 3000,
      },
    ];

    if (config.LAVALINK_NODE_2_HOST) {
      nodes.push({
        id: config.LAVALINK_NODE_2_ID || 'Backup-Node-2',
        host: config.LAVALINK_NODE_2_HOST,
        port: config.LAVALINK_NODE_2_PORT || 443,
        authorization: config.LAVALINK_NODE_2_PASSWORD || 'https://discord.gg/mjS5J2K3ep',
        secure: config.LAVALINK_NODE_2_SECURE,
        retryAmount: 100,
        retryDelay: 3000,
      });
    }

    if (config.LAVALINK_NODE_3_HOST) {
      nodes.push({
        id: config.LAVALINK_NODE_3_ID || 'Backup-Node-3',
        host: config.LAVALINK_NODE_3_HOST,
        port: config.LAVALINK_NODE_3_PORT || 443,
        authorization: config.LAVALINK_NODE_3_PASSWORD || 'https://seretia.link/discord',
        secure: config.LAVALINK_NODE_3_SECURE,
        retryAmount: 100,
        retryDelay: 3000,
      });
    }

    this.lavalink = new LavalinkManager({
      nodes,
      sendToShard: (guildId: string, payload: any) => {
        const guild = this.client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
      client: {
        id: config.DISCORD_CLIENT_ID,
        username: 'Rainfall',
      },
      autoSkip: true,
      playerOptions: {
        defaultSearchPlatform: 'ytsearch',
        onEmptyQueue: {
          autoPlayFunction: async (player) => {
            const isAutoplay = player.get<boolean>('autoplay');
            if (isAutoplay) {
              const nextTrack = await this.autoplayService.resolveNextAutoplayTrack(player);
              if (nextTrack) {
                log.info(`Autoplay queued next track: ${nextTrack.info.title} in guild ${player.guildId}`);
                await player.queue.add(nextTrack);
                await player.play();
                return;
              }
            }
          },
        },
      },
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.lavalink.nodeManager.on('connect', (node) => {
      log.info(`Lavalink node [${node.id}] successfully connected!`);
    });

    this.lavalink.nodeManager.on('disconnect', (node, reason) => {
      if (reason && typeof reason === 'object' && (reason as any).code === 4000) {
        log.warn(`Lavalink node [${node.id}] rate-limited by remote host (code 4000). Pausing reconnect.`);
        return;
      }
      log.warn(`Lavalink node [${node.id}] disconnected: ${JSON.stringify(reason)}`);
    });

    this.lavalink.nodeManager.on('error', (node, error) => {
      log.warn(`Lavalink node [${node.id}] encountered an error: ${error.message}`);
    });

    this.lavalink.on('trackStart', async (player, track) => {
      log.info(`Track started: "${track?.info.title}" in guild [${player.guildId}]`);
      if (this.client.panelManager) {
        // Automatically delete old panel and repost at the very bottom of the chat after every song ends!
        await this.client.panelManager.updatePanel(player.guildId, true, true);
      }
    });

    this.lavalink.on('trackEnd', async (player, track) => {
      log.info(`Track ended: "${track?.info.title}" in guild [${player.guildId}]`);
      if (this.client.panelManager) {
        await this.client.panelManager.updatePanel(player.guildId, false);
      }
    });

    this.lavalink.on('playerDestroy', async (player) => {
      log.info(`Player destroyed for guild [${player.guildId}]`);
      if (this.client.panelManager) {
        await this.client.panelManager.onPlayerDestroyed(player.guildId);
      }
    });
  }

  public async init(): Promise<void> {
    try {
      await this.lavalink.init({
        id: this.client.user?.id || config.DISCORD_CLIENT_ID,
        username: this.client.user?.username || 'Rainfall',
      });
      log.info('Lavalink Manager initialized successfully');
    } catch (err: unknown) {
      log.warn(`Lavalink initialization warning (Lavalink node might be offline or starting up): ${(err as Error).message}`);
    }
  }

  /**
   * Acquire a per-guild mutex to serialize modifications to player and queue state
   */
  public async withGuildLock<T>(guildId: string, action: () => Promise<T>): Promise<T> {
    const currentLock = this.guildMutexes.get(guildId) || Promise.resolve();
    let releaseLock: () => void;
    const nextLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.guildMutexes.set(guildId, currentLock.then(() => nextLock));

    try {
      await currentLock;
      return await action();
    } finally {
      releaseLock!();
      if (this.guildMutexes.get(guildId) === nextLock) {
        this.guildMutexes.delete(guildId);
      }
    }
  }

  public getPlayer(guildId: string): Player | undefined {
    return this.lavalink.getPlayer(guildId);
  }

  public async createOrGetPlayer(
    guildId: string,
    voiceChannelId: string,
    textChannelId: string
  ): Promise<Player> {
    let player = this.getPlayer(guildId);

    if (!player) {
      const connectedNodes = Array.from(this.lavalink.nodeManager.nodes.values()).filter(
        (n) => n.connected
      );

      if (connectedNodes.length === 0) {
        log.warn('Attempted to create player but no Lavalink nodes are connected. Triggering auto-reconnect...');
        for (const n of this.lavalink.nodeManager.nodes.values()) {
          try { n.connect(); } catch {}
        }
        throw new Error('Audio streaming cluster is establishing connection. Please retry in 5 seconds.');
      }

      player = this.lavalink.createPlayer({
        guildId,
        voiceChannelId,
        textChannelId,
        selfDeaf: true,
        selfMute: false,
        volume: 100,
      });

      player.set('autoplay', false);
      player.set('activeFilters', []);
      await player.connect();
    } else {
      if (player.voiceChannelId !== voiceChannelId) {
        player.voiceChannelId = voiceChannelId;
        await player.connect();
      }
      player.textChannelId = textChannelId;
    }

    return player;
  }

  public async search(
    query: string,
    requester: { id: string; username: string; avatar?: string | null }
  ): Promise<SearchResult> {
    let cleanQuery = query.trim();

    const node =
      this.lavalink.nodeManager.leastUsedNodes()[0] ||
      Array.from(this.lavalink.nodeManager.nodes.values())[0];

    if (!node) {
      throw new Error('No Lavalink nodes are currently available to execute search requests.');
    }

    return await node.search(
      {
        query: cleanQuery,
        source: cleanQuery.startsWith('http') ? undefined : 'ytsearch',
      },
      requester
    );
  }

  public async applyFilter(player: Player, filter: AudioFilter): Promise<void> {
    const activeFilters: AudioFilter[] = player.get<AudioFilter[]>('activeFilters') || [];

    switch (filter) {
      case AudioFilter.CLEAR:
        await player.filterManager.resetFilters();
        player.set('activeFilters', []);
        break;

      case AudioFilter.BASSBOOST:
        await player.filterManager.setEQ([
          { band: 0, gain: 0.25 },
          { band: 1, gain: 0.20 },
          { band: 2, gain: 0.15 },
          { band: 3, gain: 0.10 },
          { band: 4, gain: 0.05 },
        ]);
        if (!activeFilters.includes(AudioFilter.BASSBOOST)) activeFilters.push(AudioFilter.BASSBOOST);
        player.set('activeFilters', activeFilters);
        break;

      case AudioFilter.NIGHTCORE:
        await player.filterManager.toggleNightcore();
        if (activeFilters.includes(AudioFilter.NIGHTCORE)) {
          player.set('activeFilters', activeFilters.filter((f) => f !== AudioFilter.NIGHTCORE));
        } else {
          activeFilters.push(AudioFilter.NIGHTCORE);
          player.set('activeFilters', activeFilters);
        }
        break;

      case AudioFilter.VAPORWAVE:
        await player.filterManager.toggleVaporwave();
        if (activeFilters.includes(AudioFilter.VAPORWAVE)) {
          player.set('activeFilters', activeFilters.filter((f) => f !== AudioFilter.VAPORWAVE));
        } else {
          activeFilters.push(AudioFilter.VAPORWAVE);
          player.set('activeFilters', activeFilters);
        }
        break;

      case AudioFilter.KARAOKE:
        await player.filterManager.toggleKaraoke();
        if (activeFilters.includes(AudioFilter.KARAOKE)) {
          player.set('activeFilters', activeFilters.filter((f) => f !== AudioFilter.KARAOKE));
        } else {
          activeFilters.push(AudioFilter.KARAOKE);
          player.set('activeFilters', activeFilters);
        }
        break;

      case AudioFilter.EIGHT_D:
        await player.filterManager.toggleRotation();
        if (activeFilters.includes(AudioFilter.EIGHT_D)) {
          player.set('activeFilters', activeFilters.filter((f) => f !== AudioFilter.EIGHT_D));
        } else {
          activeFilters.push(AudioFilter.EIGHT_D);
          player.set('activeFilters', activeFilters);
        }
        break;

      case AudioFilter.TREMOLO:
        await player.filterManager.toggleTremolo();
        if (activeFilters.includes(AudioFilter.TREMOLO)) {
          player.set('activeFilters', activeFilters.filter((f) => f !== AudioFilter.TREMOLO));
        } else {
          activeFilters.push(AudioFilter.TREMOLO);
          player.set('activeFilters', activeFilters);
        }
        break;

      case AudioFilter.VIBRATO:
        await player.filterManager.toggleVibrato();
        if (activeFilters.includes(AudioFilter.VIBRATO)) {
          player.set('activeFilters', activeFilters.filter((f) => f !== AudioFilter.VIBRATO));
        } else {
          activeFilters.push(AudioFilter.VIBRATO);
          player.set('activeFilters', activeFilters);
        }
        break;

      case AudioFilter.LOW_PASS:
        await player.filterManager.toggleLowPass();
        if (activeFilters.includes(AudioFilter.LOW_PASS)) {
          player.set('activeFilters', activeFilters.filter((f) => f !== AudioFilter.LOW_PASS));
        } else {
          activeFilters.push(AudioFilter.LOW_PASS);
          player.set('activeFilters', activeFilters);
        }
        break;

      default:
        break;
    }
  }
}
