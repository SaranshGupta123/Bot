import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import * as path from 'path';

// Load .env from root if available
loadDotenv({ path: path.resolve(process.cwd(), '.env') });
loadDotenv({ path: path.resolve(__dirname, '../../../.env') });

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Discord
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required').default('dummy_token_for_validation'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required').default('dummy_client_id'),
  DISCORD_CLIENT_SECRET: z.string().default('dummy_secret'),
  DISCORD_PUBLIC_KEY: z.string().default('dummy_public_key'),
  DISCORD_DEFAULT_PREFIX: z.string().default('!'),
  DEVELOPER_USER_IDS: z.string().default('').transform((val) => 
    val.split(',').map((s) => s.trim()).filter(Boolean)
  ),

  // Database & Cache
  DATABASE_URL: z.string().default('postgresql://rainfall:rainfall_password@localhost:5432/rainfall_db?schema=public'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().default(0),

  // Lavalink Cluster
  LAVALINK_NODE_1_HOST: z.string().default('localhost'),
  LAVALINK_NODE_1_PORT: z.coerce.number().default(2333),
  LAVALINK_NODE_1_PASSWORD: z.string().default('youshallnotpass'),
  LAVALINK_NODE_1_SECURE: z.string().default('false').transform((val) => val === 'true'),
  LAVALINK_NODE_1_ID: z.string().default('Main-Node-1'),

  LAVALINK_NODE_2_HOST: z.string().optional().default(''),
  LAVALINK_NODE_2_PORT: z.coerce.number().optional().default(2333),
  LAVALINK_NODE_2_PASSWORD: z.string().optional().default('youshallnotpass'),
  LAVALINK_NODE_2_SECURE: z.string().default('false').transform((val) => val === 'true'),
  LAVALINK_NODE_2_ID: z.string().optional().default('Secondary-Node-2'),

  LAVALINK_NODE_3_HOST: z.string().optional().default(''),
  LAVALINK_NODE_3_PORT: z.coerce.number().optional().default(2333),
  LAVALINK_NODE_3_PASSWORD: z.string().optional().default('youshallnotpass'),
  LAVALINK_NODE_3_SECURE: z.string().default('false').transform((val) => val === 'true'),
  LAVALINK_NODE_3_ID: z.string().optional().default('Backup-Node-3'),

  // Spotify
  SPOTIFY_CLIENT_ID: z.string().optional().default(''),
  SPOTIFY_CLIENT_SECRET: z.string().optional().default(''),

  // API & Web
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(4000),
  API_CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars').default('super_secret_jwt_key_default_32_characters_long'),

  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  NEXT_PUBLIC_WS_URL: z.string().default('ws://localhost:4000'),
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().default('nextauth_secret_random_32_chars_long'),
});

export type AppConfig = z.infer<typeof configSchema>;

let parsedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!parsedConfig) {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Configuration validation failed:', result.error.format());
      throw new Error(`Configuration validation error: ${result.error.message}`);
    }
    parsedConfig = result.data;
  }
  return parsedConfig;
}

export const config = getConfig();

