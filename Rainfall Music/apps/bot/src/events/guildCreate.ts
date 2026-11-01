import { Guild } from 'discord.js';
import { createScopedLogger } from '@rainfall/shared';
import type { RainfallClient } from '../client/RainfallClient';

const log = createScopedLogger('GuildCreate');

export async function onGuildCreate(guild: Guild, client: RainfallClient): Promise<void> {
  log.info(`Joined new Discord Guild: ${guild.name} (${guild.id}) - Owner: ${guild.ownerId}`);
  await client.databaseService.ensureGuild(guild.id, guild.name, guild.ownerId).catch((err) => {
    log.warn(`Failed to sync newly joined guild ${guild.id}: ${(err as Error).message}`);
  });
}

