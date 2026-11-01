import { SlashCommandBuilder, EmbedBuilder, version as djsVersion } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS, formatDuration } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class BotInfoCommand extends BaseCommand {
  constructor() {
    super({
      name: 'botinfo',
      description: 'Display detailed technical metrics about Rainfall and Lavalink nodes',
      category: CommandCategory.ADMIN,
      slashBuilder: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('View technical bot metrics and cluster health'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const memory = process.memoryUsage();
    const heapUsedMB = (memory.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (memory.heapTotal / 1024 / 1024).toFixed(2);

    const nodes = Array.from(client.musicManager.lavalink.nodeManager.nodes.values());
    let nodeStatusStr = '';
    nodes.forEach((n) => {
      nodeStatusStr += `• **${n.id}**: ${n.connected ? '🟢 Connected' : '🔴 Disconnected'} (${n.options.host}:${n.options.port})\n`;
    });
    if (nodes.length === 0) nodeStatusStr = 'No nodes registered.';

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle('🤖 Rainfall Bot System Information')
      .addFields([
        { name: 'Gateway Latency', value: `${client.ws.ping}ms`, inline: true },
        { name: 'Process Uptime', value: formatDuration(client.uptime || 0), inline: true },
        { name: 'Memory Usage', value: `${heapUsedMB} MB / ${heapTotalMB} MB`, inline: true },
        { name: 'discord.js Version', value: `v${djsVersion}`, inline: true },
        { name: 'Node.js Runtime', value: process.version, inline: true },
        { name: 'Connected Guilds', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'Lavalink Cluster Nodes', value: nodeStatusStr, inline: false },
      ])
      .setFooter({ text: 'Rainfall Production Infrastructure' })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
}

