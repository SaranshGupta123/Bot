import { SlashCommandBuilder } from 'discord.js';
import { CommandCategory } from '@rainfall/types';
import { BaseCommand } from '../BaseCommand';
import { CommandContext } from '../CommandContext';
import { formatDuration, truncateText, createScopedLogger } from '@rainfall/shared';
import type { RainfallClient } from '../../client/RainfallClient';

const log = createScopedLogger('PlayCommand');

export class PlayCommand extends BaseCommand {
  constructor() {
    super({
      name: 'play',
      description: 'Search and play audio from YouTube, SoundCloud, or Spotify',
      category: CommandCategory.MUSIC,
      aliases: ['p'],
      requireVoice: true,
      cooldown: 2,
      slashBuilder: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist in your voice channel')
        .addStringOption((opt) =>
          opt
            .setName('query')
            .setDescription('Song title, artist, or URL (YouTube, SoundCloud, Spotify)')
            .setRequired(true)
            .setAutocomplete(true)
        ),
    });
  }

  public async execute(ctx: CommandContext, client: RainfallClient): Promise<any> {
    const query = ctx.getString('query');
    if (!query) {
      return ctx.sendError('Query Required', 'Please provide a song title or URL to play!');
    }

    await ctx.defer();

    const voiceChannel = ctx.member.voice.channel;
    if (!voiceChannel) {
      return ctx.sendError('Voice Channel Required', 'You must be in a voice channel to play music.');
    }

    try {
      // Create or join player
      const player = await client.musicManager.createOrGetPlayer(
        ctx.guild.id,
        voiceChannel.id,
        ctx.channel.id
      );

      const requester = {
        id: ctx.author.id,
        username: ctx.author.username,
        avatar: ctx.author.avatarURL(),
      };

      const result = await client.musicManager.search(query, requester);

      if (!result || !result.tracks || result.tracks.length === 0) {
        return ctx.sendError('No Results Found', `Could not find any playable audio for: \`${query}\``);
      }

      if (result.loadType === 'playlist') {
        for (const track of result.tracks) {
          track.userData = { requester };
          await player.queue.add(track);
        }

        const playlistTitle = result.playlist?.title || 'Playlist';
        await ctx.sendSuccess(
          'Playlist Enqueued 📜',
          `Added **${result.tracks.length}** tracks from **${playlistTitle}** to the queue.`
        );
      } else {
        const track = result.tracks[0];
        track.userData = { requester };
        await player.queue.add(track);

        if (player.playing) {
          await ctx.sendSuccess(
            'Track Added to Queue 🎵',
            `Enqueued **[${truncateText(track.info.title, 50)}](${track.info.uri})** [${formatDuration(track.info.duration)}] (Position #${player.queue.tracks.length})`
          );
        } else {
          await ctx.sendSuccess(
            'Starting Playback 🎵',
            `Now playing **[${truncateText(track.info.title, 50)}](${track.info.uri})**`
          );
        }
      }

      if (!player.playing) {
        await player.play();
      }

      // Launch or update interactive voice channel control panel
      await client.panelManager.updatePanel(ctx.guild.id, true);
    } catch (err: unknown) {
      log.error('Error in play command', err);
      return ctx.sendError('Playback Error', `An error occurred while loading audio: ${(err as Error).message}`);
    }
  }

  public async autocomplete(interaction: any, client: RainfallClient): Promise<any> {
    const focusedValue = interaction.options.getFocused();
    if (!focusedValue || focusedValue.trim().length === 0) {
      return interaction.respond([]);
    }

    try {
      const results = await client.musicManager.search(focusedValue, {
        id: interaction.user.id,
        username: interaction.user.username,
      });

      if (!results || !results.tracks) {
        return interaction.respond([]);
      }

      const choices = results.tracks.slice(0, 5).map((track) => ({
        name: truncateText(`${track.info.title} - ${track.info.author}`, 100),
        value: track.info.uri || track.info.title,
      }));

      return interaction.respond(choices);
    } catch {
      return interaction.respond([]);
    }
  }
}
