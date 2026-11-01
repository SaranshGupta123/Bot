'use client';

import React, { useState } from 'react';
import { Terminal, Search, Music, Settings, ListMusic, User, ShieldAlert, Check } from 'lucide-react';

interface CommandInfo {
  name: string;
  category: 'music' | 'config' | 'playlists' | 'user' | 'admin';
  description: string;
  syntax: string;
  prefixSyntax: string;
  aliases: string[];
  permissions?: string;
}

const ALL_COMMANDS: CommandInfo[] = [
  // Music
  { name: 'play', category: 'music', description: 'Search and play audio from YouTube, SoundCloud, or Spotify', syntax: '/play <query>', prefixSyntax: '!play <query>', aliases: ['p'] },
  { name: 'pause', category: 'music', description: 'Pause the current audio stream', syntax: '/pause', prefixSyntax: '!pause', aliases: [] },
  { name: 'resume', category: 'music', description: 'Resume paused audio playback', syntax: '/resume', prefixSyntax: '!resume', aliases: [] },
  { name: 'skip', category: 'music', description: 'Skip the current track or forward several tracks', syntax: '/skip [amount]', prefixSyntax: '!skip [amount]', aliases: ['s', 'next'] },
  { name: 'previous', category: 'music', description: 'Replay the previously played track from history', syntax: '/previous', prefixSyntax: '!previous', aliases: ['prev', 'back'] },
  { name: 'stop', category: 'music', description: 'Stop playback, clear queue, and leave voice channel', syntax: '/stop', prefixSyntax: '!stop', aliases: [] },
  { name: 'queue', category: 'music', description: 'View current music queue and upcoming songs', syntax: '/queue [page]', prefixSyntax: '!queue [page]', aliases: ['q'] },
  { name: 'nowplaying', category: 'music', description: 'Display detailed real-time track info and progress bar', syntax: '/nowplaying', prefixSyntax: '!nowplaying', aliases: ['np'] },
  { name: 'volume', category: 'music', description: 'Check or adjust playback volume (1-150%)', syntax: '/volume [1-150]', prefixSyntax: '!volume [1-150]', aliases: ['vol', 'v'] },
  { name: 'seek', category: 'music', description: 'Seek to a timestamp (e.g. 1:30 or seconds)', syntax: '/seek <time>', prefixSyntax: '!seek <time>', aliases: [] },
  { name: 'shuffle', category: 'music', description: 'Randomize the order of tracks in the queue', syntax: '/shuffle', prefixSyntax: '!shuffle', aliases: [] },
  { name: 'loop', category: 'music', description: 'Configure repeat mode (off, track, queue)', syntax: '/loop [mode]', prefixSyntax: '!loop [mode]', aliases: [] },
  { name: 'autoplay', category: 'music', description: 'Toggle smart autoplay when the queue ends', syntax: '/autoplay', prefixSyntax: '!autoplay', aliases: [] },
  { name: 'lyrics', category: 'music', description: 'Fetch synchronized lyrics for the active track', syntax: '/lyrics [song]', prefixSyntax: '!lyrics [song]', aliases: [] },
  { name: 'filter', category: 'music', description: 'Apply real-time DSP audio filters (bassboost, nightcore, 8d, etc.)', syntax: '/filter <preset>', prefixSyntax: '!filter <preset>', aliases: [] },
  { name: 'remove', category: 'music', description: 'Remove a specific track from queue by position', syntax: '/remove <position>', prefixSyntax: '!remove <position>', aliases: [] },
  { name: 'move', category: 'music', description: 'Move a track from one queue position to another', syntax: '/move <from> <to>', prefixSyntax: '!move <from> <to>', aliases: [] },
  { name: 'clear', category: 'music', description: 'Clear all upcoming tracks from queue', syntax: '/clear', prefixSyntax: '!clear', aliases: [] },
  { name: 'replay', category: 'music', description: 'Restart the current track from 0:00', syntax: '/replay', prefixSyntax: '!replay', aliases: [] },
  { name: '247', category: 'music', description: 'Keep the bot in voice channel 24/7 without disconnecting', syntax: '/247', prefixSyntax: '!247', aliases: [], permissions: 'DJ / Admin' },
  { name: 'jump', category: 'music', description: 'Jump directly to a specific track index in queue', syntax: '/jump <position>', prefixSyntax: '!jump <position>', aliases: ['skipto'] },
  { name: 'leave', category: 'music', description: 'Disconnect the bot from voice channel', syntax: '/leave', prefixSyntax: '!leave', aliases: ['dc', 'disconnect'] },

  // Config
  { name: 'prefix', category: 'config', description: 'Set custom text command prefix for this server', syntax: '/prefix <new_prefix>', prefixSyntax: '!prefix <new_prefix>', aliases: [], permissions: 'Manage Server' },
  { name: 'settings', category: 'config', description: 'Inspect current server music and bot settings', syntax: '/settings', prefixSyntax: '!settings', aliases: [] },
  { name: 'djrole', category: 'config', description: 'Set or clear the DJ role for playback control', syntax: '/djrole [role]', prefixSyntax: '!djrole [role]', aliases: [], permissions: 'Manage Server' },
  { name: 'allowedchannels', category: 'config', description: 'Restrict music commands to specific channels', syntax: '/allowedchannels <action>', prefixSyntax: '!allowedchannels <action>', aliases: [], permissions: 'Manage Server' },
  { name: 'defaultvolume', category: 'config', description: 'Configure default starting volume (1-150%)', syntax: '/defaultvolume <volume>', prefixSyntax: '!defaultvolume <volume>', aliases: [], permissions: 'Manage Server' },
  { name: 'permissions', category: 'config', description: 'View current authorization tiers and DJ status', syntax: '/permissions', prefixSyntax: '!permissions', aliases: [] },

  // Playlists
  { name: 'playlist create', category: 'playlists', description: 'Create a new personal music playlist', syntax: '/playlist create <name> [desc]', prefixSyntax: '!playlist create <name> [desc]', aliases: ['pl create'] },
  { name: 'playlist delete', category: 'playlists', description: 'Delete an existing playlist', syntax: '/playlist delete <name>', prefixSyntax: '!playlist delete <name>', aliases: ['pl delete'] },
  { name: 'playlist add', category: 'playlists', description: 'Add a track or current playing song to playlist', syntax: '/playlist add <name> <song>', prefixSyntax: '!playlist add <name> <song>', aliases: ['pl add'] },
  { name: 'playlist remove', category: 'playlists', description: 'Remove a song from playlist by index position', syntax: '/playlist remove <name> <pos>', prefixSyntax: '!playlist remove <name> <pos>', aliases: ['pl remove'] },
  { name: 'playlist play', category: 'playlists', description: 'Enqueue all tracks from a playlist into voice channel', syntax: '/playlist play <name>', prefixSyntax: '!playlist play <name>', aliases: ['pl play'] },
  { name: 'playlist view', category: 'playlists', description: 'Inspect all tracks inside a playlist', syntax: '/playlist view <name>', prefixSyntax: '!playlist view <name>', aliases: ['pl view'] },
  { name: 'playlist share', category: 'playlists', description: 'Toggle public visibility for a playlist', syntax: '/playlist share <name>', prefixSyntax: '!playlist share <name>', aliases: ['pl share'] },

  // User
  { name: 'favorites', category: 'user', description: 'View or play songs from your personal favorites library', syntax: '/favorites [list|play]', prefixSyntax: '!favorites [list|play]', aliases: ['favs', 'fav'] },
  { name: 'history', category: 'user', description: 'View your recent listening history', syntax: '/history', prefixSyntax: '!history', aliases: [] },
  { name: 'profile', category: 'user', description: 'View your music stats and favorite counts', syntax: '/profile', prefixSyntax: '!profile', aliases: [] },
  { name: 'stats', category: 'user', description: 'Display ecosystem playback and server statistics', syntax: '/stats', prefixSyntax: '!stats', aliases: [] },

  // Admin
  { name: 'maintenance', category: 'admin', description: 'Toggle global maintenance mode', syntax: '/maintenance <enabled>', prefixSyntax: '!maintenance <enabled>', aliases: [], permissions: 'Developer' },
  { name: 'blacklist', category: 'admin', description: 'Add or remove entity from global blacklist', syntax: '/blacklist <type> <id> <blocked>', prefixSyntax: '!blacklist <type> <id> <blocked>', aliases: [], permissions: 'Developer' },
  { name: 'serverinfo', category: 'admin', description: 'Inspect server statistics and configuration', syntax: '/serverinfo', prefixSyntax: '!serverinfo', aliases: [] },
  { name: 'botinfo', category: 'admin', description: 'Display technical Lavalink nodes and bot memory stats', syntax: '/botinfo', prefixSyntax: '!botinfo', aliases: [] },
];

export default function CommandsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredCommands = ALL_COMMANDS.filter((cmd) => {
    const matchesCategory = selectedCategory === 'all' || cmd.category === selectedCategory;
    const matchesSearch =
      cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.syntax.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', name: 'All Commands', icon: Terminal },
    { id: 'music', name: 'Music', icon: Music },
    { id: 'config', name: 'Configuration', icon: Settings },
    { id: 'playlists', name: 'Playlists', icon: ListMusic },
    { id: 'user', name: 'User & Profile', icon: User },
    { id: 'admin', name: 'Admin & System', icon: ShieldAlert },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">Command Explorer</h1>
        <p className="text-dark-muted text-base">
          Browse all 37 commands supported by Rainfall. Both slash commands (<code className="text-sky-400">/command</code>) and server-configurable prefix commands (<code className="text-sky-400">!command</code>) are available.
        </p>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-between">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-dark-card border border-dark-border text-dark-muted hover:text-white hover:bg-dark-surface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-dark-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="w-full bg-dark-card border border-dark-border rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-dark-muted focus:outline-none focus:border-sky-500 transition"
          />
        </div>
      </div>

      {/* Commands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCommands.map((cmd) => (
          <div
            key={cmd.name}
            className="p-5 rounded-2xl bg-dark-card/60 border border-dark-border hover:border-sky-500/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-sky-400 text-sm">{cmd.syntax}</span>
                {cmd.permissions && (
                  <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                    {cmd.permissions}
                  </span>
                )}
              </div>
              <p className="text-xs text-dark-muted leading-relaxed mb-4">{cmd.description}</p>
            </div>

            <div className="pt-3 border-t border-dark-border/60 text-[11px] text-slate-400 flex flex-col gap-1 font-mono">
              <div>
                <span className="text-dark-muted">Prefix: </span>
                <span className="text-slate-300">{cmd.prefixSyntax}</span>
              </div>
              {cmd.aliases.length > 0 && (
                <div>
                  <span className="text-dark-muted">Aliases: </span>
                  <span className="text-indigo-400">{cmd.aliases.map((a) => `!${a}`).join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCommands.length === 0 && (
        <div className="text-center py-16 text-dark-muted">
          No commands matched your query "{searchQuery}".
        </div>
      )}
    </div>
  );
}

