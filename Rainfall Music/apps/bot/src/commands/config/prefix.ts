import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import type { RainfallClient } from '../../client/RainfallClient';

export class PrefixCommand extends BaseCommand {
  constructor() {
    super({
      name: 'prefix',
      description: 'View or configure the server command prefix for text commands',
      category: CommandCategory.CONFIG,
      slashBuilder: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('View or set the server command prefix')
        .addStringOption((opt) =>
          opt
            .setName('new_prefix')
            .setDescription('New prefix character(s) (e.g. !, ?, r!, r?)')
            .setRequired(false)
            .setMaxLength(5)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const newPrefix = ctx.getString('new_prefix') || ctx.args[0];

    // If no argument given, view current prefix
    if (!newPrefix || newPrefix.trim().length === 0) {
      const cfg = await client.databaseService.getGuildConfig(ctx.guild.id);
      return ctx.sendInfo(
        'Server Command Prefix ⚙️',
        `• Current Prefix: \`${cfg.prefix}\`\n` +
        `• No-Prefix Mode: ${cfg.noPrefix !== false ? '🟢 **ENABLED** (Type `play song`, `skip`, `queue` directly without prefix)' : '⚪ Disabled'}\n\n` +
        `To change the prefix, run \`/prefix new_prefix:<new>\` or \`${cfg.prefix}prefix <new>\`.`
      );
    }

    // Permission check for changing prefix
    const isOwner = ctx.guild.ownerId === ctx.author.id;
    const canManage = ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild) || isOwner;
    if (!canManage) {
      return ctx.sendError('Permission Denied', 'You need the **Manage Server** permission to change the prefix.');
    }

    if (newPrefix.length > 5) {
      return ctx.sendError('Invalid Prefix', 'Prefix must be 5 characters or fewer.');
    }

    await client.databaseService.updateGuildConfig(ctx.guild.id, {
      prefix: newPrefix.trim(),
    });

    await ctx.sendSuccess(
      'Prefix Updated ⚙️',
      `Server command prefix set to: \`${newPrefix.trim()}\`\nExample: \`${newPrefix.trim()}play <song>\``
    );
  }
}
