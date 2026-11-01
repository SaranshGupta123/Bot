import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@rainfall/database';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS, formatDuration } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class StatsCommand extends BaseCommand {
  constructor() {
    super({
      name: 'stats',
      description: 'Display server and global ecosystem playback statistics',
      category: CommandCategory.USER,
      slashBuilder: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View playback and server statistics'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    const activePlayers = Array.from(client.musicManager.lavalink.players.values()).filter((p) => p.playing).length;

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle('📊 Rainfall Ecosystem Statistics')
      .addFields([
        { name: 'Servers', value: `${totalGuilds}`, inline: true },
        { name: 'Total Users', value: `${totalUsers.toLocaleString()}`, inline: true },
        { name: 'Active Players', value: `${activePlayers}`, inline: true },
        { name: 'Bot Uptime', value: formatDuration(client.uptime || 0), inline: true },
        { name: 'Node Latency', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Node.js Version', value: process.version, inline: true },
      ])
      .setFooter({ text: 'Rainfall Monitoring System' })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
}

