import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class PingCommand extends BaseCommand {
  constructor() {
    super({
      name: 'ping',
      description: 'Check Discord Gateway latency and Lavalink audio cluster response',
      category: CommandCategory.ADMIN,
      aliases: ['latency', 'pong'],
      slashBuilder: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot and audio latency'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const start = Date.now();
    const wsPing = client.ws.ping;

    // Get nodes status
    const nodes = Array.from(client.musicManager.lavalink.nodeManager.nodes.values());
    const primaryNode = nodes[0];
    const nodePing = primaryNode && primaryNode.connected ? `${primaryNode.options.host}` : 'Standby';

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle('🏓 Pong! Latency Diagnostics')
      .addFields([
        { name: 'Gateway Latency', value: `\`${wsPing}ms\``, inline: true },
        { name: 'API Roundtrip', value: `\`${Date.now() - start}ms\``, inline: true },
        { name: 'Audio Node', value: `\`${nodePing}\``, inline: true },
      ])
      .setFooter({ text: 'Rainfall High-Speed Performance' });

    await ctx.reply({ embeds: [embed] });
  }
}

