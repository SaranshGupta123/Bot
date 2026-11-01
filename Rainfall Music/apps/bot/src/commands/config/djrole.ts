import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class DJRoleCommand extends BaseCommand {
  constructor() {
    super({
      name: 'djrole',
      description: 'Configure or clear the DJ role for music management permissions',
      category: CommandCategory.CONFIG,
      userPermissions: [PermissionsBitField.Flags.ManageGuild],
      slashBuilder: new SlashCommandBuilder()
        .setName('djrole')
        .setDescription('Set or clear the DJ role')
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('Role to assign DJ permissions (leave empty to clear)')
            .setRequired(false)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return ctx.sendError('Permission Denied', 'You need the **Manage Server** permission to change the DJ role.');
    }

    let roleId: string | null = null;
    if (ctx.interaction) {
      const role = ctx.interaction.options.getRole('role');
      roleId = role?.id || null;
    } else {
      const mention = ctx.args[0];
      if (mention) {
        const matches = mention.match(/^<@&(\d+)>$/) || mention.match(/^(\d+)$/);
        if (matches) roleId = matches[1];
      }
    }

    await client.databaseService.updateGuildConfig(ctx.guild.id, {
      djRoleId: roleId,
    });

    if (roleId) {
      await ctx.sendSuccess('DJ Role Configured 🎧', `Members with <@&${roleId}> can now control playback.`);
    } else {
      await ctx.sendSuccess('DJ Role Cleared 🎧', 'DJ role restriction has been removed. All members can control music.');
    }
  }
}

