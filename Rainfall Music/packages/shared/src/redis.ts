import Redis from 'ioredis';
import { config } from '@rainfall/config';
import { createScopedLogger } from './logger';

const log = createScopedLogger('Redis');

export class RedisService {
  private static instance: Redis | null = null;
  public static isConnected = false;

  public static getClient(): Redis {
    if (!this.instance) {
      const isUpstash = config.REDIS_HOST.includes('upstash.io');

      this.instance = new Redis({
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        password: config.REDIS_PASSWORD || undefined,
        db: config.REDIS_DB,
        lazyConnect: true,
        enableOfflineQueue: false, // NEVER queue or hang commands if Redis is disconnected
        maxRetriesPerRequest: 1, // Fail fast, never block Discord execution
        commandTimeout: 800, // 800ms max timeout
        connectTimeout: 3000,
        tls: isUpstash ? {} : undefined,
        retryStrategy(times) {
          if (times > 5) {
            log.warn('Max Redis connection attempts reached. Operating in pure in-memory mode.');
            return null; // Stop retrying and stay in in-memory mode
          }
          return Math.min(times * 1000, 3000);
        },
      });

      this.instance.on('connect', () => {
        RedisService.isConnected = true;
        log.info('Connected to Redis cache cluster');
      });

      this.instance.on('ready', () => {
        RedisService.isConnected = true;
      });

      this.instance.on('close', () => {
        RedisService.isConnected = false;
      });

      this.instance.on('error', (err) => {
        RedisService.isConnected = false;
        log.warn(`Redis connection inactive (using in-memory cache): ${err.message}`);
      });
    }

    return this.instance;
  }

  public static async safeConnect(): Promise<void> {
    try {
      const client = this.getClient();
      if (client.status === 'wait') {
        await client.connect();
      }
    } catch (err: unknown) {
      log.warn(`Operating in fallback in-memory cache mode: ${(err as Error).message}`);
    }
  }
}

export const redis = RedisService.getClient();
