import { EmbedBuilder } from 'discord.js';
import { BRAND_COLORS, EMOJIS } from './constants';
import { formatDuration, truncateText } from './formatters';
import { TrackMetadata, LoopMode, AudioFilter } from '@rainfall/types';

export function createSuccessEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.SUCCESS)
    .setTitle(`${EMOJIS.CHECK} ${title}`);

  if (description) {
    embed.setDescription(description);
  }
  return embed;
}

export function createErrorEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.ERROR)
    .setTitle(`${EMOJIS.CROSS} ${title}`);

  if (description) {
    embed.setDescription(description);
  }
  return embed;
}

export function createInfoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.RAIN_ACCENT)
    .setTitle(`${EMOJIS.SPARKLES} ${title}`);

  if (description) {
    embed.setDescription(description);
  }
  return embed;
}

export interface ControlPanelEmbedOptions {
  track: TrackMetadata;
  position: number;
  volume: number;
  loopMode: LoopMode;
  autoplay: boolean;
  filters: AudioFilter[];
  queueLength: number;
  queueDuration: number;
  isPaused: boolean;
}

/**
 * Native Discord Control Panel Embed adhering strictly to Section 3.1 & Reference UI:
 * Minimalist, ultra-compact, native to Discord, displaying:
 * - Title: "1 track in queue"
 * - Description:
 *   ✦ [Song Title](uri) - [ mm:ss ],
 *   *Requested by -* @Username
 *   🔊 Volume: 100
 */
export function buildControlPanelEmbed(options: ControlPanelEmbedOptions): EmbedBuilder {
  const {
    track,
    volume,
    queueLength,
  } = options;

  const totalLength = track.isStream ? 'Live' : formatDuration(track.length);
  const queueCountText = queueLength === 0
    ? 'Queue empty'
    : queueLength === 1
      ? '1 track in queue'
      : `${queueLength} tracks in queue`;
  const requesterMention = track.requester?.id ? `<@${track.requester.id}>` : 'Autoplay';

  const embed = new EmbedBuilder()
    .setColor(BRAND_COLORS.CONTROL_PANEL_GOLD)
    .setTitle(queueCountText)
    .setDescription(
      `\u2726 [${truncateText(track.title, 65)}](${track.uri || 'https://discord.com'}) - [ ${totalLength} ],\n` +
      `*Requested by -* ${requesterMention}\n\n` +
      `🔊 Volume: ${volume}`
    );

  return embed;
}

export interface QueueEmbedOptions {
  tracks: TrackMetadata[];
  currentTrack?: TrackMetadata | null;
  totalTracks: number;
  totalDuration: number;
  currentPage: number;
  pageSize?: number;
}

/**
 * Live Music Queue Embed strictly matching Section 12:
 * Displays all queued tracks, position, title, duration, requester,
 * pagination indicators, and clean empty state.
 */
export function buildQueueEmbed(options: QueueEmbedOptions): EmbedBuilder {
  const {
    tracks,
    totalDuration,
    currentPage = 1,
    pageSize = 10,
  } = options;

  const embed = new EmbedBuilder().setColor(0x2b2d31);

  if (!tracks || tracks.length === 0) {
    embed.setDescription(
      '🎶 **The queue is empty!**\nAdd a song using `/play` or `play <song>` to get started.'
    );
    return embed;
  }

  const totalPages = Math.max(Math.ceil(tracks.length / pageSize), 1);
  const page = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (page - 1) * pageSize;
  const pageTracks = tracks.slice(startIndex, startIndex + pageSize);

  const countLabel = tracks.length === 1 ? '1 TRACK' : `${tracks.length} TRACKS`;
  const estDuration = formatDuration(totalDuration);

  let description = `**🎶 UP NEXT — ${countLabel}** \`[${estDuration}]\`\n\n`;

  const trackLines = pageTracks.map((t, idx) => {
    const pos = startIndex + idx + 1;
    const dur = t.isStream ? 'Live' : formatDuration(t.length);
    const reqMention = t.requester?.id ? `<@${t.requester.id}>` : 'Autoplay';
    return `${pos}. 🎵 **[${truncateText(t.title, 50)}](${t.uri || 'https://discord.com'})** \`[${dur}]\`\n   Requested by: ${reqMention}`;
  });

  description += trackLines.join('\n\n');

  embed.setDescription(description);

  if (totalPages > 1) {
    embed.setFooter({
      text: `Page ${page} of ${totalPages} • ${tracks.length} tracks in queue`,
    });
  } else {
    embed.setFooter({
      text: `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'} queued • Est. ${estDuration}`,
    });
  }

  return embed;
}
