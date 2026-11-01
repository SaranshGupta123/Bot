import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class ServerInfoCommand extends BaseCommand {
  constructor() {
    super({
      name: 'serverinfo',
      description: 'Display details and configuration status for this Discord server',
      category: CommandCategory.ADMIN,
      slashBuilder: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display server information'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const guild = ctx.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle(`🏰 Server Details: ${guild.name}`)
      .setThumbnail(guild.iconURL() || '')
      .addFields([
        { name: 'Server ID', value: `\`${guild.id}\``, inline: true },
        { name: 'Owner', value: owner ? `<@${owner.id}> (${owner.user.username})` : 'Unknown', inline: true },
        { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
        { name: 'Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
      ])
      .setFooter({ text: 'Rainfall Diagnostics' })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
}

