/**
 * Shared Type Definitions for the Rainfall Music Ecosystem
 */

export enum CommandCategory {
  MUSIC = 'music',
  CONFIG = 'config',
  PLAYLISTS = 'playlists',
  USER = 'user',
  ADMIN = 'admin',
}

export enum LoopMode {
  OFF = 'off',
  TRACK = 'track',
  QUEUE = 'queue',
}

export enum AudioFilter {
  CLEAR = 'clear',
  BASSBOOST = 'bassboost',
  NIGHTCORE = 'nightcore',
  VAPORWAVE = 'vaporwave',
  KARAOKE = 'karaoke',
  EIGHT_D = '8d',
  TREMOLO = 'tremolo',
  VIBRATO = 'vibrato',
  LOW_PASS = 'lowpass',
  EQUALIZER = 'equalizer',
  ROTATION = 'rotation',
  TIMESCALE = 'timescale',
}

export interface TrackMetadata {
  encoded: string;
  identifier: string;
  title: string;
  author: string;
  length: number;
  seekable: boolean;
  isStream: boolean;
  uri?: string;
  artworkUrl?: string;
  isrc?: string;
  sourceName: string;
  requester?: {
    id: string;
    username: string;
    avatar?: string | null;
  };
}

export interface PlayerSnapshot {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  playing: boolean;
  paused: boolean;
  volume: number;
  position: number;
  currentTrack: TrackMetadata | null;
  loopMode: LoopMode;
  autoplay: boolean;
  filters: AudioFilter[];
  queue: TrackMetadata[];
  queueLength: number;
  queueDuration: number;
  panelMessageId?: string | null;
  twentyFourSeven: boolean;
}

export interface GuildConfigRecord {
  guildId: string;
  prefix: string;
  defaultVolume: number;
  djRoleId: string | null;
  allowedChannelIds: string[];
  twentyFourSeven: boolean;
  autoplay: boolean;
  voteSkipEnabled: boolean;
  voteSkipThreshold: number;
  maxQueueSize: number;
  noPrefix: boolean;
  noPrefixUserIds: string[];
  updatedAt: Date;
}

export interface ControlPanelRecord {
  guildId: string;
  channelId: string;
  messageId: string;
  voiceChannelId: string;
  lastUpdated: Date;
}

export interface UserPlaylistRecord {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  tracks: TrackMetadata[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFavoriteRecord {
  id: string;
  userId: string;
  trackId: string;
  title: string;
  author: string;
  duration: number;
  uri: string;
  artworkUrl?: string | null;
  source: string;
  createdAt: Date;
}

export interface ListeningHistoryRecord {
  id: string;
  userId: string;
  guildId: string;
  title: string;
  author: string;
  duration: number;
  uri: string;
  playedAt: Date;
}

export interface LavalinkNodeConfig {
  id: string;
  host: string;
  port: number;
  password: string;
  secure?: boolean;
  retryAmount?: number;
  retryDelay?: number;
}

export interface NodeMetrics {
  id: string;
  online: boolean;
  players: number;
  playingPlayers: number;
  uptime: number;
  cpuCores: number;
  systemLoad: number;
  lavalinkLoad: number;
  allocatedMemory: number;
  usedMemory: number;
  freeMemory: number;
}

export enum WebSocketEventType {
  PLAYER_STATE_CHANGE = 'PLAYER_STATE_CHANGE',
  TRACK_START = 'TRACK_START',
  TRACK_END = 'TRACK_END',
  QUEUE_UPDATE = 'QUEUE_UPDATE',
  VOLUME_CHANGE = 'VOLUME_CHANGE',
  FILTER_CHANGE = 'FILTER_CHANGE',
  VOICE_STATE_CHANGE = 'VOICE_STATE_CHANGE',
  NODE_STATUS_CHANGE = 'NODE_STATUS_CHANGE',
}

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  guildId?: string;
  payload: T;
  timestamp: number;
}

