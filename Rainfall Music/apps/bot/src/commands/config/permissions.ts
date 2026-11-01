import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class PermissionsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'permissions',
      description: 'View permission and authorization tiers for the bot in this server',
      category: CommandCategory.CONFIG,
      slashBuilder: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('Check server bot and member permissions'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const isOwner = ctx.guild.ownerId === ctx.author.id;
    const isAdmin = ctx.member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isManager = ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

    const cfg = await client.databaseService.getGuildConfig(ctx.guild.id);
    const hasDJ = cfg.djRoleId ? ctx.member.roles.cache.has(cfg.djRoleId) : true;

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle(`🛡️ Permissions Status for ${ctx.author.username}`)
      .setDescription('Your authorization levels in this Discord server:')
      .addFields([
        {
          name: 'Server Owner',
          value: isOwner ? '✅ Yes' : '❌ No',
          inline: true,
        },
        {
          name: 'Administrator',
          value: isAdmin ? '✅ Yes' : '❌ No',
          inline: true,
        },
        {
          name: 'Manage Server',
          value: isManager ? '✅ Yes' : '❌ No',
          inline: true,
        },
        {
          name: 'DJ Permissions',
          value: hasDJ ? '✅ Allowed' : '❌ Restricted to DJ Role',
          inline: true,
        },
      ])
      .setFooter({ text: 'Rainfall Access Control Matrix' });

    await ctx.reply({ embeds: [embed] });
  }
}

