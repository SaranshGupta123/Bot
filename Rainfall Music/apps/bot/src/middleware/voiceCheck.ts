import { PermissionsBitField } from 'discord.js';
import { CommandContext } from '../commands/CommandContext';
import type { RainfallClient } from '../client/RainfallClient';

export interface MiddlewareResult {
  passed: boolean;
  message?: string;
}

export function checkVoice(
  ctx: CommandContext,
  client: RainfallClient,
  options: { requireVoice?: boolean; requireSameVoice?: boolean }
): MiddlewareResult {
  const memberVoiceChannel = ctx.member.voice.channel;

  if (options.requireVoice && !memberVoiceChannel) {
    return {
      passed: false,
      message: 'You must be connected to a voice channel to use this command!',
    };
  }

  const botVoiceChannelId = client.musicManager?.getPlayer(ctx.guild.id)?.voiceChannelId;

  if (options.requireSameVoice && botVoiceChannelId && memberVoiceChannel?.id !== botVoiceChannelId) {
    return {
      passed: false,
      message: `You must be in the same voice channel (<#${botVoiceChannelId}>) as Rainfall to control music!`,
    };
  }

  // If bot is joining for the first time, check connect & speak permissions
  if (memberVoiceChannel && !botVoiceChannelId) {
    const permissions = memberVoiceChannel.permissionsFor(ctx.guild.members.me!);
    if (!permissions.has(PermissionsBitField.Flags.Connect)) {
      return {
        passed: false,
        message: `I lack the **Connect** permission in <#${memberVoiceChannel.id}>!`,
      };
    }
    if (!permissions.has(PermissionsBitField.Flags.Speak)) {
      return {
        passed: false,
        message: `I lack the **Speak** permission in <#${memberVoiceChannel.id}>!`,
      };
    }
  }

  return { passed: true };
}

