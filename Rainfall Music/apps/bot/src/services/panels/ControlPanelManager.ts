import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
  Message,
  DiscordAPIError,
  GuildMember,
} from 'discord.js';
import { Player, Track } from 'lavalink-client';
import { buildControlPanelEmbed, buildQueueEmbed, createScopedLogger, truncateText, formatDuration } from '@rainfall/shared';
import { LoopMode, AudioFilter, TrackMetadata } from '@rainfall/types';
import type { RainfallClient } from '../../client/RainfallClient';

const log = createScopedLogger('ControlPanelManager');

export class ControlPanelManager {
  private panelUpdateDebounces = new Map<string, NodeJS.Timeout>();
  private isUpdating = new Map<string, boolean>();
  private needsRerun = new Map<string, boolean>();
  private shouldRepost = new Map<string, boolean>();

  constructor(private client: RainfallClient) {}

  /**
   * Build the Discord StringSelectMenu for song suggestions
   */
  public async buildSuggestionRow(player: Player): Promise<ActionRowBuilder<StringSelectMenuBuilder> | null> {
    let suggestions = await this.client.musicManager.autoplayService.getSuggestions(player, 5);

    // Fallback if initial suggestions are empty
    if (!suggestions || suggestions.length === 0) {
      const current = player.queue.current;
      const fallbackQuery = current?.info.author || 'popular music';
      const fallbackRes = await this.client.musicManager.search(
        fallbackQuery,
        (current?.userData as any)?.requester || { id: 'bot', username: 'Rainfall' }
      ).catch(() => null);

      if (fallbackRes && fallbackRes.tracks) {
        suggestions = fallbackRes.tracks
          .filter((t) => !current || t.info.identifier !== current.info.identifier)
          .slice(0, 5);
      }
    }

    if (!suggestions || suggestions.length === 0) {
      return null;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('panel_song_suggestion')
      .setPlaceholder('Select a suggested song');

    const options = suggestions.slice(0, 5).map((track, idx) => {
      const dur = track.info.isStream ? 'Live' : formatDuration(track.info.duration);
      return new StringSelectMenuOptionBuilder()
        .setLabel(truncateText(`${track.info.title}`, 90))
        .setDescription(truncateText(`${track.info.author} • ${dur}`, 90))
        .setValue(`suggest_${idx}_${track.info.identifier.substring(0, 50)}`)
        .setEmoji('🎵');
    });

    selectMenu.addOptions(options);

    // Cache suggested tracks in player memory for quick resolution on selection
    player.set('cachedSuggestions', suggestions);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  }

  /**
   * Build the 3-row, 15-button interactive grid strictly matching Section 3.3 and Reference UI
   */
  public buildButtonRows(player: Player): ActionRowBuilder<ButtonBuilder>[] {
    const loopMode = (player.repeatMode as LoopMode) || LoopMode.OFF;

    // ROW 1: Play/Resume, Previous, Pause, Skip, Loop
    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_play')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_previous')
        .setEmoji('⏮️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_pause')
        .setEmoji('⏸️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_skip')
        .setEmoji('⏭️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_loop')
        .setEmoji(loopMode === LoopMode.TRACK ? '🔂' : '🔁')
        .setStyle(ButtonStyle.Secondary)
    );

    // ROW 2: Volume Down, Seek Backward (10s), Favourite, Seek Forward (10s), Volume Up
    const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_vol_down')
        .setEmoji('🔉')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_seek_back')
        .setEmoji('⏪')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_favourite')
        .setEmoji('❤️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_seek_fwd')
        .setEmoji('⏩')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_vol_up')
        .setEmoji('🔊')
        .setStyle(ButtonStyle.Secondary)
    );

    // ROW 3: Lyrics/Voice, Shuffle, Stop, Filters, Queue/Options
    const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_lyrics')
        .setEmoji('🎙️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_shuffle')
        .setEmoji('🔀')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_stop')
        .setEmoji('⏹️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_filters')
        .setEmoji('🎚️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('panel_queue')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary)
    );

    return [row1, row2, row3];
  }

  /**
   * Action Row 5: Dynamic Queue Pagination & Management strictly matching Section 12
   */
  public buildQueuePaginationRow(player: Player): ActionRowBuilder<ButtonBuilder> | null {
    const totalTracks = player.queue.tracks.length;
    if (totalTracks <= 10) return null;

    const totalPages = Math.ceil(totalTracks / 10);
    const currentPage = Math.min(Math.max(player.get<number>('panelQueuePage') || 1, 1), totalPages);

    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_queue_prev')
        .setEmoji('◀️')
        .setLabel('Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1),
      new ButtonBuilder()
        .setCustomId('panel_queue_indicator')
        .setLabel(`Page ${currentPage}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('panel_queue_next')
        .setEmoji('▶️')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages),
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
  }

  /**
   * Main entry to send or update the interactive control panel in the guild's text channel.
   * When repostAtBottom is true (e.g. on new track start), deletes the previous panel message
   * and dispatches a fresh panel at the very bottom of the chat.
   */
  public async updatePanel(guildId: string, immediate: boolean = false, repostAtBottom: boolean = false): Promise<void> {
    const player = this.client.musicManager.getPlayer(guildId);
    if (!player || !player.queue.current) {
      return;
    }

    if (repostAtBottom) {
      this.shouldRepost.set(guildId, true);
    }

    if (!immediate) {
      if (this.panelUpdateDebounces.has(guildId)) return;
      this.panelUpdateDebounces.set(
        guildId,
        setTimeout(() => {
          this.panelUpdateDebounces.delete(guildId);
          this.executePanelUpdate(guildId).catch((err) => {
            log.error(`Debounced panel update failed for guild ${guildId}`, err);
          });
        }, 3000)
      );
      return;
    }

    await this.executePanelUpdate(guildId);
  }

  private async executePanelUpdate(guildId: string): Promise<void> {
    if (this.isUpdating.get(guildId)) {
      this.needsRerun.set(guildId, true);
      return;
    }
    this.isUpdating.set(guildId, true);

    try {
      do {
        this.needsRerun.set(guildId, false);
        const repost = this.shouldRepost.get(guildId) || false;
        this.shouldRepost.set(guildId, false);
        await this.performPanelUpdate(guildId, repost);
      } while (this.needsRerun.get(guildId));
    } catch (err: unknown) {
      log.error(`executePanelUpdate failed for guild ${guildId}: ${(err as Error).message}`, err);
    } finally {
      this.isUpdating.delete(guildId);
      this.needsRerun.delete(guildId);
      this.shouldRepost.delete(guildId);
    }
  }

  private async performPanelUpdate(guildId: string, repostAtBottom: boolean = false): Promise<void> {
    const player = this.client.musicManager.getPlayer(guildId);
    if (!player || !player.queue.current) return;

    const channelId = player.textChannelId;
    if (!channelId) return;

    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || !('send' in channel)) {
      log.warn(`Channel ${channelId} in guild ${guildId} is not text-based or cannot receive messages.`);
      return;
    }

    const totalTracks = player.queue.tracks.length + (player.queue.current ? 1 : 0);
    const totalQueueDuration = player.queue.tracks.reduce((acc, t) => acc + (t.info.duration || 0), 0);
    const track = player.queue.current;
    const currentPage = player.get<number>('panelQueuePage') || 1;

    // 1. Now Playing Embed (Gold accent, ultra-compact)
    const nowPlayingEmbed = buildControlPanelEmbed({
      track: {
        encoded: track.encoded || '',
        identifier: track.info.identifier,
        title: track.info.title,
        author: track.info.author,
        length: track.info.duration,
        seekable: track.info.isSeekable,
        isStream: track.info.isStream,
        uri: track.info.uri || undefined,
        artworkUrl: track.info.artworkUrl || undefined,
        sourceName: track.info.sourceName,
        requester: (track.userData as any)?.requester,
      },
      position: player.position,
      volume: player.volume,
      loopMode: (player.repeatMode as LoopMode) || LoopMode.OFF,
      autoplay: player.get<boolean>('autoplay') || false,
      filters: player.get<AudioFilter[]>('activeFilters') || [],
      queueLength: totalTracks,
      queueDuration: totalQueueDuration,
      isPaused: player.paused,
    });

    // 2. Full Live Music Queue Embed (Section 12)
    const queuedTracksMetadata: TrackMetadata[] = player.queue.tracks.map((t, i) => ({
      encoded: t.encoded || '',
      identifier: t.info.identifier || `queued_${i}`,
      title: t.info.title || 'Unknown Title',
      author: t.info.author || 'Unknown Artist',
      length: t.info.duration || 0,
      seekable: !!t.info.isSeekable,
      isStream: !!t.info.isStream,
      uri: t.info.uri || undefined,
      artworkUrl: t.info.artworkUrl || undefined,
      sourceName: t.info.sourceName || 'youtube',
      requester: (t.userData as any)?.requester,
    }));

    const queueEmbed = buildQueueEmbed({
      tracks: queuedTracksMetadata,
      totalTracks: player.queue.tracks.length,
      totalDuration: totalQueueDuration,
      currentPage,
      pageSize: 10,
    });

    const components: any[] = [];
    const suggestionRow = await this.buildSuggestionRow(player).catch(() => null);
    if (suggestionRow) {
      components.push(suggestionRow);
    }

    const buttonRows = this.buildButtonRows(player);
    components.push(...buttonRows);

    const paginationRow = this.buildQueuePaginationRow(player);
    if (paginationRow) {
      components.push(paginationRow);
    }

    const embeds = [nowPlayingEmbed, queueEmbed];

    // Check if we have an existing control panel message in database/cache
    const existingPanel = await this.client.databaseService.getControlPanel(guildId).catch(() => null);

    // If repostAtBottom is false, attempt to edit existing message in-place
    if (!repostAtBottom && existingPanel && existingPanel.messageId && existingPanel.channelId === channel.id) {
      try {
        const msg = await (channel as any).messages.fetch(existingPanel.messageId);
        if (msg) {
          await msg.edit({
            embeds,
            components,
          });
          return;
        }
      } catch (err: unknown) {
        if (err instanceof DiscordAPIError && err.code === 10008) {
          log.info(`Control panel message in guild ${guildId} was deleted, re-creating`);
        } else {
          log.warn(`Could not edit existing panel message in guild ${guildId}: ${(err as Error).message}`);
        }
      }
    }

    // If repostAtBottom is true (new song started or requested), delete previous panel message first
    if (existingPanel && existingPanel.messageId) {
      try {
        const targetChan = existingPanel.channelId === channel.id
          ? channel
          : await this.client.channels.fetch(existingPanel.channelId).catch(() => null);
        if (targetChan && targetChan.isTextBased() && 'messages' in targetChan) {
          const oldMsg = await (targetChan as any).messages.fetch(existingPanel.messageId).catch(() => null);
          if (oldMsg) {
            await oldMsg.delete().catch(() => {});
          }
        }
      } catch {}
    }

    // Send fresh panel message at the very bottom of the chat
    const newMsg = await (channel as any).send({
      embeds,
      components,
    });

    await this.client.databaseService.saveControlPanel(
      guildId,
      channel.id,
      newMsg.id,
      player.voiceChannelId || ''
    ).catch((e) => log.warn(`Failed to cache control panel: ${(e as Error).message}`));
  }

  public async onPlayerDestroyed(guildId: string): Promise<void> {
    try {
      const existingPanel = await this.client.databaseService.getControlPanel(guildId).catch(() => null);
      if (existingPanel && existingPanel.channelId && existingPanel.messageId) {
        const channel = await this.client.channels.fetch(existingPanel.channelId).catch(() => null);
        if (channel && channel.isTextBased() && 'messages' in channel) {
          const msg = await (channel as any).messages.fetch(existingPanel.messageId).catch(() => null);
          if (msg) {
            await msg.delete().catch(() => {});
          }
        }
      }
      await this.client.databaseService.deleteControlPanel(guildId);
    } catch (err: unknown) {
      log.warn(`Error cleaning up control panel on destroy for guild ${guildId}: ${(err as Error).message}`);
    }
  }
}
