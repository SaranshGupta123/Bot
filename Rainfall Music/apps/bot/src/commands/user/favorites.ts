import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@rainfall/database';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS, formatDuration, truncateText } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class FavoritesCommand extends BaseCommand {
  constructor() {
    super({
      name: 'favorites',
      description: 'View or play songs from your personal favorites library',
      category: CommandCategory.USER,
      aliases: ['favs', 'fav'],
      slashBuilder: new SlashCommandBuilder()
        .setName('favorites')
        .setDescription('Manage your personal favorites')
        .addSubcommand((sub) =>
          sub.setName('list').setDescription('View your saved favorite tracks')
        )
        .addSubcommand((sub) =>
          sub.setName('play').setDescription('Enqueue all your favorite tracks')
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const sub = ctx.interaction?.options.getSubcommand() || ctx.args[0] || 'list';

    if (sub === 'play') {
      const voiceChannel = ctx.member.voice.channel;
      if (!voiceChannel) return ctx.sendError('Voice Required', 'Join a voice channel to play your favorites.');

      const favorites = await prisma.favoriteTrack.findMany({
        where: { userId: ctx.author.id },
      });

      if (favorites.length === 0) {
        return ctx.sendError('No Favorites', 'You have not saved any favorites yet! Click ❤️ on the control panel to save songs.');
      }

      await ctx.defer();
      const player = await client.musicManager.createOrGetPlayer(ctx.guild.id, voiceChannel.id, ctx.channel.id);

      for (const fav of favorites) {
        const res = await client.musicManager.search(fav.uri || `${fav.title} ${fav.author}`, {
          id: ctx.author.id,
          username: ctx.author.username,
        });
        if (res?.tracks?.length) {
          const track = res.tracks[0];
          track.userData = { requester: { id: ctx.author.id, username: ctx.author.username } };
          await player.queue.add(track);
        }
      }

      if (!player.playing) await player.play();
      await client.panelManager.updatePanel(ctx.guild.id, true);

      await ctx.sendSuccess('Favorites Enqueued ❤️', `Added **${favorites.length}** favorite track(s) to the queue.`);
    } else {
      const favorites = await prisma.favoriteTrack.findMany({
        where: { userId: ctx.author.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
      });

      if (favorites.length === 0) {
        return ctx.sendInfo('No Favorites Saved', 'Your favorites library is currently empty. Use the ❤️ button on the voice control panel while songs are playing to save them!');
      }

      let description = '';
      favorites.forEach((fav, i) => {
        description += `\`${i + 1}.\` [${truncateText(fav.title, 40)}](${fav.uri}) - \`${formatDuration(fav.duration)}\`\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(0xeb459e)
        .setTitle(`❤️ ${ctx.author.username}'s Favorites`)
        .setDescription(description)
        .setFooter({ text: `Showing up to 15 favorites • Total: ${favorites.length}` });

      await ctx.reply({ embeds: [embed] });
    }
  }
}

