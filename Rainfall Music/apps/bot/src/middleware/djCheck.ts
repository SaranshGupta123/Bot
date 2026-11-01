import { PermissionsBitField } from 'discord.js';
import { CommandContext } from '../commands/CommandContext';
import type { RainfallClient } from '../client/RainfallClient';
import { MiddlewareResult } from './voiceCheck';

export async function checkDJ(
  ctx: CommandContext,
  client: RainfallClient,
  requireDJ: boolean
): Promise<MiddlewareResult> {
  if (!requireDJ) return { passed: true };

  // Guild owners and Administrators always bypass DJ role checks
  if (ctx.member.permissions.has(PermissionsBitField.Flags.Administrator) || ctx.guild.ownerId === ctx.author.id) {
    return { passed: true };
  }

  // Check if member has Manage Guild
  if (ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return { passed: true };
  }

  // Fetch Guild Config
  const guildConfig = await client.databaseService.getGuildConfig(ctx.guild.id);
  if (!guildConfig || !guildConfig.djRoleId) {
    // If no DJ role is configured, DJ check passes for all
    return { passed: true };
  }

  // Check if member possesses the DJ role
  const hasRole = ctx.member.roles.cache.has(guildConfig.djRoleId);
  if (!hasRole) {
    return {
      passed: false,
      message: `This command requires the configured DJ role (<@&${guildConfig.djRoleId}>) or Administrator privileges!`,
    };
  }

  return { passed: true };
}

