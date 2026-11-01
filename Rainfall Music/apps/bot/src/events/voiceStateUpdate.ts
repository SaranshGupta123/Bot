import { VoiceState } from 'discord.js';
import { createScopedLogger } from '@rainfall/shared';
import type { RainfallClient } from '../client/RainfallClient';

const log = createScopedLogger('VoiceStateUpdate');

export async function onVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
  client: RainfallClient
): Promise<void> {
  const guildId = newState.guild.id;

  // Send raw data to Lavalink
  await (client.musicManager.lavalink as any).sendRawData({
    t: 'VOICE_STATE_UPDATE',
    d: {
      guild_id: guildId,
      user_id: newState.id,
      session_id: newState.sessionId,
      channel_id: newState.channelId,
      self_mute: newState.selfMute,
      self_deaf: newState.selfDeaf,
      mute: newState.serverMute,
      deaf: newState.serverDeaf,
      suppress: newState.suppress,
    },
  }).catch(() => {});

  const player = client.musicManager.getPlayer(guildId);
  if (!player) return;

  // Check if bot was disconnected
  if (newState.id === client.user?.id && !newState.channelId) {
    log.info(`Bot was disconnected from voice channel in guild [${guildId}]`);
    await player.destroy();
    return;
  }

  // Check if bot is left alone in voice channel
  if (player.voiceChannelId) {
    const voiceChannel = newState.guild.channels.cache.get(player.voiceChannelId);
    if (voiceChannel && voiceChannel.isVoiceBased()) {
      const nonBotMembers = voiceChannel.members.filter((m) => !m.user.bot);
      if (nonBotMembers.size === 0) {
        const config = await client.databaseService.getGuildConfig(guildId);
        if (!config.twentyFourSeven) {
          log.info(`Bot is alone in voice channel in guild [${guildId}], destroying player.`);
          await player.destroy();
        }
      }
    }
  }
}

