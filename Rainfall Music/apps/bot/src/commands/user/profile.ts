import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@rainfall/database';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class ProfileCommand extends BaseCommand {
  constructor() {
    super({
      name: 'profile',
      description: 'View your user profile and music ecosystem statistics',
      category: CommandCategory.USER,
      slashBuilder: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View music user profile'),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const [favCount, plCount, historyCount] = await Promise.all([
      prisma.favoriteTrack.count({ where: { userId: ctx.author.id } }).catch(() => 0),
      prisma.playlist.count({ where: { userId: ctx.author.id } }).catch(() => 0),
      prisma.listeningHistory.count({ where: { userId: ctx.author.id } }).catch(() => 0),
    ]);

    const embed = new EmbedBuilder()
      .setColor(BRAND_COLORS.RAIN_ACCENT)
      .setAuthor({ name: `${ctx.author.username}'s Music Profile`, iconURL: ctx.author.avatarURL() || undefined })
      .setThumbnail(ctx.author.avatarURL() || '')
      .addFields([
        { name: 'Favorites', value: `${favCount} tracks`, inline: true },
        { name: 'Playlists', value: `${plCount} created`, inline: true },
        { name: 'Songs Listened', value: `${historyCount}`, inline: true },
      ])
      .setFooter({ text: 'Rainfall User Profile' })
      .setTimestamp();

    await ctx.reply({ embeds: [embed] });
  }
}

