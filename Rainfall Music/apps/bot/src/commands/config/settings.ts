import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class SettingsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'settings',
      description: 'View full server audio and bot configuration',
      category: CommandCategory.CONFIG,
      slashBuilder: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View current server settings'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const cfg = await client.databaseService.getGuildConfig(ctx.guild.id);

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle(`⚙️ Configuration for ${ctx.guild.name}`)
      .setDescription('Current server configuration settings for the Rainfall Music Ecosystem:')
      .addFields([
        {
          name: 'Text Prefix',
          value: `\`${cfg.prefix}\``,
          inline: true,
        },
        {
          name: 'Default Volume',
          value: `${cfg.defaultVolume}%`,
          inline: true,
        },
        {
          name: 'DJ Role',
          value: cfg.djRoleId ? `<@&${cfg.djRoleId}>` : 'None (Open to all)',
          inline: true,
        },
        {
          name: '24/7 Presence',
          value: cfg.twentyFourSeven ? '🟢 Active' : '⚪ Inactive',
          inline: true,
        },
        {
          name: 'Smart Autoplay',
          value: cfg.autoplay ? '🟢 Enabled' : '⚪ Disabled',
          inline: true,
        },
        {
          name: 'Vote Skip',
          value: cfg.voteSkipEnabled ? `🟢 Enabled (${cfg.voteSkipThreshold}%)` : '⚪ Disabled',
          inline: true,
        },
        {
          name: 'Restricted Channels',
          value: cfg.allowedChannelIds.length > 0 ? cfg.allowedChannelIds.map((id) => `<#${id}>`).join(', ') : 'None (All channels permitted)',
          inline: false,
        },
      ])
      .setFooter({ text: 'Rainfall Configuration Portal' });

    await ctx.reply({ embeds: [embed] });
  }
}

