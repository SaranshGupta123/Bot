import { ActivityType } from 'discord.js';
import { createScopedLogger } from '@rainfall/shared';
import type { RainfallClient } from '../client/RainfallClient';

const log = createScopedLogger('ReadyEvent');

export async function onReady(client: RainfallClient): Promise<void> {
  log.info(`Rainfall Bot successfully logged in as ${client.user?.tag} (${client.user?.id})`);

  // Initialize Lavalink Nodes
  await client.musicManager.init();

  // Set Rich Presence
  client.user?.setActivity({
    name: '🎵 High Fidelity Audio | /play',
    type: ActivityType.Listening,
  });

  // Sync all cached Discord guilds into Database
  for (const guild of client.guilds.cache.values()) {
    await client.databaseService.ensureGuild(guild.id, guild.name, guild.ownerId).catch(() => {});
  }

  log.info(`Serving ${client.guilds.cache.size} Discord guilds and ${client.users.cache.size} cached users.`);
}
