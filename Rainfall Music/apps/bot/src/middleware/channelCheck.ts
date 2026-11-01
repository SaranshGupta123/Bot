import { PermissionsBitField } from 'discord.js';
import { CommandContext } from '../commands/CommandContext';
import type { RainfallClient } from '../client/RainfallClient';
import { MiddlewareResult } from './voiceCheck';

export async function checkChannel(
  ctx: CommandContext,
  client: RainfallClient
): Promise<MiddlewareResult> {
  // Admins always bypass channel restrictions
  if (ctx.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return { passed: true };
  }

  const guildConfig = await client.databaseService.getGuildConfig(ctx.guild.id);
  if (!guildConfig || !guildConfig.allowedChannelIds || guildConfig.allowedChannelIds.length === 0) {
    return { passed: true };
  }

  const isAllowed = guildConfig.allowedChannelIds.includes(ctx.channel.id);
  if (!isAllowed) {
    const channelList = guildConfig.allowedChannelIds.map((id) => `<#${id}>`).join(', ');
    return {
      passed: false,
      message: `Music commands are restricted to the following channels in this server: ${channelList}`,
    };
  }

  return { passed: true };
}

