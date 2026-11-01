import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { formatDuration, truncateText, BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class QueueCommand extends BaseCommand {
  constructor() {
    super({
      name: 'queue',
      description: 'View the current music queue and upcoming songs',
      category: CommandCategory.MUSIC,
      aliases: ['q'],
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the server music queue')
        .addIntegerOption((opt) =>
          opt
            .setName('page')
            .setDescription('Page number of queue to view')
            .setMinValue(1)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player || !player.queue.current) {
      return ctx.sendError('Empty Queue', 'There are no tracks currently playing or queued.');
    }

    const page = ctx.getInteger('page') || player.get<number>('panelQueuePage') || 1;
    const pageSize = 10;
    const totalTracks = player.queue.tracks.length;
    const totalPages = Math.max(Math.ceil(totalTracks / pageSize), 1);

    if (page > totalPages) {
      return ctx.sendError('Invalid Page', `Page ${page} does not exist. Total pages: ${totalPages}`);
    }

    const startIndex = (page - 1) * pageSize;
    const currentTrack = player.queue.current;
    const queuedTracks = player.queue.tracks.slice(startIndex, startIndex + pageSize);

    let description = `**Now Playing:**\n[${truncateText(currentTrack.info.title, 55)}](${currentTrack.info.uri}) - \`${formatDuration(currentTrack.info.duration || 0)}\`\n\n`;

    if (queuedTracks.length > 0) {
      description += `**🎶 UP NEXT — ${totalTracks} ${totalTracks === 1 ? 'TRACK' : 'TRACKS'} (Page ${page}/${totalPages}):**\n\n`;
      queuedTracks.forEach((t, i) => {
        const pos = startIndex + i + 1;
        const dur = t.info.isStream ? 'Live' : formatDuration(t.info.duration || 0);
        const reqMention = (t.userData as any)?.requester?.id ? `<@${(t.userData as any).requester.id}>` : 'Autoplay';
        description += `${pos}. 🎵 **[${truncateText(t.info.title, 50)}](${t.info.uri})** \`[${dur}]\`\n   Requested by: ${reqMention}\n\n`;
      });
    } else {
      description += '🎶 **The queue is empty!**\nAdd a song using `/play` or `play <song>` to get started.';
    }

    const totalQueueDuration = player.queue.tracks.reduce((acc, cur) => acc + (cur.info.duration || 0), 0);
    const currentRemaining = currentTrack.info.duration ? Math.max(currentTrack.info.duration - (player.position || 0), 0) : 0;

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`📜 Queue for ${ctx.guild.name}`)
      .setDescription(description)
      .addFields([
        {
          name: 'Total Tracks',
          value: `${totalTracks + 1}`,
          inline: true,
        },
        {
          name: 'Total Duration',
          value: formatDuration(totalQueueDuration + currentRemaining),
          inline: true,
        },
        {
          name: 'Loop Mode',
          value: `${player.repeatMode.toUpperCase()}`,
          inline: true,
        },
      ])
      .setFooter({ text: `Page ${page} of ${totalPages} • Rainfall Audio Engine` });

    const components: any[] = [];
    if (totalPages > 1) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('panel_queue_prev')
          .setEmoji('◀️')
          .setLabel('Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 1),
        new ButtonBuilder()
          .setCustomId('panel_queue_indicator')
          .setLabel(`Page ${page}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('panel_queue_next')
          .setEmoji('▶️')
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages),
        new ButtonBuilder()
          .setCustomId('panel_queue_clear')
          .setEmoji('🗑️')
          .setLabel('Clear')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('panel_queue_manage')
          .setEmoji('📋')
          .setLabel('Manage')
          .setStyle(ButtonStyle.Secondary)
      );
      components.push(row);
    }

    await ctx.reply({ embeds: [embed], components });
  }
}
