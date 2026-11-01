import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '@rainfall/database';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { BRAND_COLORS, formatDuration, truncateText } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

export class PlaylistCommand extends BaseCommand {
  constructor() {
    super({
      name: 'playlist',
      description: 'Create, manage, and play your personal music playlists',
      category: CommandCategory.PLAYLISTS,
      aliases: ['pl'],
      slashBuilder: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Personal and server playlist management')
        .addSubcommand((sub) =>
          sub
            .setName('create')
            .setDescription('Create a new playlist')
            .addStringOption((opt) => opt.setName('name').setDescription('Playlist name').setRequired(true))
            .addStringOption((opt) => opt.setName('description').setDescription('Optional description'))
        )
        .addSubcommand((sub) =>
          sub
            .setName('delete')
            .setDescription('Delete an existing playlist')
            .addStringOption((opt) => opt.setName('name').setDescription('Playlist name').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a track to a playlist')
            .addStringOption((opt) => opt.setName('name').setDescription('Playlist name').setRequired(true))
            .addStringOption((opt) => opt.setName('song').setDescription('Song name, URL, or current').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a track from a playlist by position')
            .addStringOption((opt) => opt.setName('name').setDescription('Playlist name').setRequired(true))
            .addIntegerOption((opt) => opt.setName('position').setDescription('Track position').setRequired(true).setMinValue(1))
        )
        .addSubcommand((sub) =>
          sub
            .setName('play')
            .setDescription('Enqueue all tracks from a playlist')
            .addStringOption((opt) => opt.setName('name').setDescription('Playlist name').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('view')
            .setDescription('Inspect tracks inside a playlist')
            .addStringOption((opt) => opt.setName('name').setDescription('Playlist name').setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName('share')
            .setDescription('Toggle public visibility for a playlist')
            .addStringOption((opt) => opt.setName('name').setDescription('Playlist name').setRequired(true))
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    let subcommand: string;
    let name: string | null = null;

    if (ctx.interaction) {
      subcommand = ctx.interaction.options.getSubcommand();
      name = ctx.interaction.options.getString('name');
    } else {
      subcommand = ctx.args[0]?.toLowerCase() || 'view';
      name = ctx.args[1] || null;
    }

    if (!name && subcommand !== 'list') {
      return ctx.sendError('Playlist Name Required', 'Please provide the name of the playlist.');
    }

    // Ensure user exists in database
    await prisma.user.upsert({
      where: { id: ctx.author.id },
      update: { username: ctx.author.username },
      create: { id: ctx.author.id, username: ctx.author.username },
    }).catch(() => {});

    switch (subcommand) {
      case 'create': {
        const desc = ctx.getString('description') || null;
        try {
          const pl = await prisma.playlist.create({
            data: {
              userId: ctx.author.id,
              name: name!,
              description: desc,
            },
          });
          await ctx.sendSuccess('Playlist Created 📁', `Created playlist **${pl.name}**! Use \`/playlist add ${pl.name} <song>\` to populate it.`);
        } catch {
          await ctx.sendError('Creation Failed', `You might already have a playlist named "${name}".`);
        }
        break;
      }

      case 'delete': {
        try {
          const pl = await prisma.playlist.findFirst({
            where: { userId: ctx.author.id, name: name! },
          });
          if (!pl) return ctx.sendError('Not Found', `Playlist "${name}" does not exist in your library.`);

          await prisma.playlist.delete({ where: { id: pl.id } });
          await ctx.sendSuccess('Playlist Deleted 🗑️', `Deleted playlist **${name}**.`);
        } catch (err: unknown) {
          await ctx.sendError('Error', (err as Error).message);
        }
        break;
      }

      case 'add': {
        let song = ctx.getString('song');
        if (!song && ctx.args[2]) song = ctx.args.slice(2).join(' ');
        if (!song) return ctx.sendError('Song Required', 'Please specify a song name, URL, or `current`.');

        const pl = await prisma.playlist.findFirst({
          where: { userId: ctx.author.id, name: name! },
          include: { tracks: true },
        });
        if (!pl) return ctx.sendError('Not Found', `Playlist "${name}" does not exist in your library.`);

        let trackToAdd: any = null;

        if (song.toLowerCase() === 'current') {
          const player = client.musicManager.getPlayer(ctx.guild.id);
          if (!player || !player.queue.current) return ctx.sendError('No Song Playing', 'No song is currently active to add.');
          trackToAdd = player.queue.current;
        } else {
          const res = await client.musicManager.search(song, { id: ctx.author.id, username: ctx.author.username });
          if (!res || !res.tracks || res.tracks.length === 0) return ctx.sendError('Not Found', `Could not find song: ${song}`);
          trackToAdd = res.tracks[0];
        }

        await prisma.playlistTrack.create({
          data: {
            playlistId: pl.id,
            title: trackToAdd.info.title,
            author: trackToAdd.info.author,
            duration: trackToAdd.info.duration,
            uri: trackToAdd.info.uri || '',
            identifier: trackToAdd.info.identifier,
            artworkUrl: trackToAdd.info.artworkUrl,
            source: trackToAdd.info.sourceName || 'youtube',
            position: pl.tracks.length + 1,
          },
        });

        await ctx.sendSuccess('Track Added 🎵', `Added **${trackToAdd.info.title}** to playlist **${pl.name}**.`);
        break;
      }

      case 'remove': {
        const pos = ctx.getInteger('position') || parseInt(ctx.args[2], 10);
        if (!pos) return ctx.sendError('Position Required', 'Specify the position number of the track to remove.');

        const pl = await prisma.playlist.findFirst({
          where: { userId: ctx.author.id, name: name! },
          include: { tracks: { orderBy: { position: 'asc' } } },
        });
        if (!pl) return ctx.sendError('Not Found', `Playlist "${name}" not found.`);

        const track = pl.tracks[pos - 1];
        if (!track) return ctx.sendError('Invalid Position', `Track #${pos} does not exist in playlist.`);

        await prisma.playlistTrack.delete({ where: { id: track.id } });
        await ctx.sendSuccess('Track Removed 🗑️', `Removed **${track.title}** from playlist **${pl.name}**.`);
        break;
      }

      case 'play': {
        const voiceChannel = ctx.member.voice.channel;
        if (!voiceChannel) return ctx.sendError('Voice Required', 'You must be in a voice channel to play a playlist.');

        const pl = await prisma.playlist.findFirst({
          where: {
            name: name!,
            OR: [{ userId: ctx.author.id }, { isPublic: true }],
          },
          include: { tracks: { orderBy: { position: 'asc' } } },
        });

        if (!pl || pl.tracks.length === 0) {
          return ctx.sendError('Empty Playlist', `Playlist "${name}" was not found or contains 0 tracks.`);
        }

        await ctx.defer();
        const player = await client.musicManager.createOrGetPlayer(ctx.guild.id, voiceChannel.id, ctx.channel.id);

        for (const t of pl.tracks) {
          const res = await client.musicManager.search(t.uri || `${t.title} ${t.author}`, {
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

        await ctx.sendSuccess('Playlist Queued 📜', `Enqueued **${pl.tracks.length}** tracks from playlist **${pl.name}**.`);
        break;
      }

      case 'view': {
        const pl = await prisma.playlist.findFirst({
          where: {
            name: name!,
            OR: [{ userId: ctx.author.id }, { isPublic: true }],
          },
          include: { tracks: { orderBy: { position: 'asc' } } },
        });

        if (!pl) return ctx.sendError('Not Found', `Playlist "${name}" not found in your library.`);

        let trackList = '';
        pl.tracks.slice(0, 15).forEach((t, i) => {
          trackList += `\`${i + 1}.\` [${truncateText(t.title, 40)}](${t.uri}) - \`${formatDuration(t.duration)}\`\n`;
        });
        if (pl.tracks.length > 15) trackList += `*...and ${pl.tracks.length - 15} more tracks.*`;
        if (pl.tracks.length === 0) trackList = '*This playlist is currently empty.*';

        const embed = new EmbedBuilder()
          .setColor(BRAND_COLORS.RAIN_ACCENT)
          .setTitle(`📁 Playlist: ${pl.name}`)
          .setDescription(`${pl.description ? `*${pl.description}*\n\n` : ''}${trackList}`)
          .addFields([
            { name: 'Total Tracks', value: `${pl.tracks.length}`, inline: true },
            { name: 'Visibility', value: pl.isPublic ? 'Public 🌐' : 'Private 🔒', inline: true },
          ]);

        await ctx.reply({ embeds: [embed] });
        break;
      }

      case 'share': {
        const pl = await prisma.playlist.findFirst({
          where: { userId: ctx.author.id, name: name! },
        });
        if (!pl) return ctx.sendError('Not Found', `Playlist "${name}" not found.`);

        const updated = await prisma.playlist.update({
          where: { id: pl.id },
          data: { isPublic: !pl.isPublic },
        });

        await ctx.sendSuccess(
          'Visibility Updated 🌐',
          `Playlist **${updated.name}** is now **${updated.isPublic ? 'PUBLIC (accessible by all users)' : 'PRIVATE (only you can play it)'}**.`
        );
        break;
      }

      default:
        await ctx.sendError('Invalid Subcommand', 'Supported: `create`, `delete`, `add`, `remove`, `play`, `view`, `share`.');
        break;
    }
  }
}

