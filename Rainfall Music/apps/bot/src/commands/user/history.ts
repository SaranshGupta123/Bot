import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@rainfall/database';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS, formatDuration, truncateText } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class HistoryCommand extends BaseCommand {
  constructor() {
    super({
      name: 'history',
      description: 'View your recent music listening history',
      category: CommandCategory.USER,
      slashBuilder: new SlashCommandBuilder()
        .setName('history')
        .setDescription('View recently played songs'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const history = await prisma.listeningHistory.findMany({
      where: { userId: ctx.author.id },
      orderBy: { playedAt: 'desc' },
      take: 10,
    }).catch(() => []);

    if (!history || history.length === 0) {
      // Check current player queue history as fallback
      const player = client.musicManager.getPlayer(ctx.guild.id);
      if (player && player.queue.previous && player.queue.previous.length > 0) {
        let desc = '';
        player.queue.previous.slice(0, 10).forEach((t, i) => {
          desc += `\`${i + 1}.\` [${truncateText(t.info.title, 45)}](${t.info.uri}) - \`${formatDuration(t.info.duration)}\`\n`;
        });
        const embed = new EmbedBuilder()
          .setColor(BRAND_COLORS.RAIN_ACCENT)
          .setTitle('📜 Recent Session History')
          .setDescription(desc);
        return ctx.reply({ embeds: [embed] });
      }

      return ctx.sendInfo('No History', 'You do not have any recorded listening history yet.');
    }

    let list = '';
    history.forEach((h, i) => {
      list += `\`${i + 1}.\` [${truncateText(h.title, 45)}](${h.uri}) - \`${formatDuration(h.duration)}\`\n`;
    });

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setTitle(`📜 Listening History for ${ctx.author.username}`)
      .setDescription(list)
      .setFooter({ text: 'Rainfall Listening Analytics' });

    await ctx.reply({ embeds: [embed] });
  }
}

