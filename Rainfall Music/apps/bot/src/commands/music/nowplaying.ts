import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { formatDuration, createProgressBar, BRAND_COLORS, truncateText } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class NowPlayingCommand extends BaseCommand {
  constructor() {
    super({
      name: 'nowplaying',
      description: 'Display detailed real-time information about the currently playing song',
      category: CommandCategory.MUSIC,
      aliases: ['np'],
      requireQueue: true,
      slashBuilder: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Display detailed info on the active track'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const player = client.musicManager.getPlayer(ctx.guild.id);
    if (!player || !player.queue.current) {
      return ctx.sendError('No Active Track', 'No song is currently playing in this server.');
    }

    const track = player.queue.current;
    const isLive = track.info.isStream;
    const duration = isLive ? 0 : track.info.duration;
    const position = player.position;
    const progress = isLive ? '🔴 LIVE' : `${formatDuration(position)} ${createProgressBar(position, duration, 16)} ${formatDuration(duration)}`;

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setAuthor({ name: 'NOW PLAYING', iconURL: ctx.author.avatarURL() || undefined })
      .setTitle(truncateText(track.info.title, 80))
      .setURL(track.info.uri || 'https://discord.com')
      .setDescription(
        `**Author / Artist:** ${track.info.author}\n` +
        `**Progress:**\n${progress}\n`
      )
      .addFields([
        {
          name: '👤 Requester',
          value: (track.userData as any)?.requester?.id ? `<@${(track.userData as any).requester.id}>` : 'Autoplay',
          inline: true,
        },
        {
          name: '🔊 Volume',
          value: `${player.volume}%`,
          inline: true,
        },
        {
          name: '🔁 Loop',
          value: player.repeatMode.toUpperCase(),
          inline: true,
        },
      ])
      .setFooter({ text: `Source: ${track.info.sourceName.toUpperCase()}` });

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    await ctx.reply({ embeds: [embed] });
  }
}
