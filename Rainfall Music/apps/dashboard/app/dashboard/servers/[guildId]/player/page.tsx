'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Repeat,
  Shuffle,
  Square,
  Search,
  Plus,
  Trash2,
  Sliders,
  Radio,
  Sparkles,
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

export default function LivePlayerPage({ params }: { params: { guildId: string } }) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(85);
  const [position, setPosition] = useState(74000);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('none');

  const [currentTrack, setCurrentTrack] = useState({
    title: 'Starboy (feat. Daft Punk)',
    author: 'The Weeknd, Daft Punk',
    duration: 230000,
    artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
    requester: 'Alex',
    source: 'YouTube Music',
  });

  const [queue, setQueue] = useState([
    { id: '1', title: 'Blinding Lights', author: 'The Weeknd', duration: 200000, requester: 'Sarah' },
    { id: '2', title: 'Save Your Tears', author: 'The Weeknd', duration: 215000, requester: 'David' },
    { id: '3', title: 'Midnight City', author: 'M83', duration: 243000, requester: 'Alex' },
  ]);

  const handleRemove = (id: string) => {
    setQueue(queue.filter((q) => q.id !== id));
  };

  const handleAddSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setQueue([
      ...queue,
      {
        id: Date.now().toString(),
        title: searchQuery,
        author: 'User Request',
        duration: 180000,
        requester: 'Web Dashboard',
      },
    ]);
    setSearchQuery('');
  };

  const progressPercent = Math.min((position / currentTrack.duration) * 100, 100);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      {/* Back Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs text-dark-muted hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </Link>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-semibold">Live Lavalink Stream</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Player & DSP Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Player Card */}
          <div className="p-8 rounded-3xl bg-dark-card/80 border border-dark-border shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
              <div className="w-36 h-36 rounded-2xl overflow-hidden bg-slate-800 shadow-xl shrink-0 border border-dark-border">
                <img
                  src={currentTrack.artwork}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-center sm:text-left overflow-hidden w-full">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-1 block">
                  {currentTrack.source}
                </span>
                <h2 className="text-2xl font-bold text-white truncate mb-1">{currentTrack.title}</h2>
                <p className="text-sm text-dark-muted mb-3">{currentTrack.author}</p>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-dark-surface border border-dark-border text-xs text-slate-300">
                  <span className="text-dark-muted">Queued by:</span>
                  <span className="font-semibold text-white">@{currentTrack.requester}</span>
                </div>
              </div>
            </div>

            {/* Scrubber Progress Bar */}
            <div className="space-y-2 mb-6">
              <div className="w-full bg-dark-surface h-2 rounded-full overflow-hidden cursor-pointer">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-dark-muted">
                <span>{formatTime(position)}</span>
                <span>{formatTime(currentTrack.duration)}</span>
              </div>
            </div>

            {/* Playback Controls Grid */}
            <div className="flex items-center justify-between pt-4 border-t border-dark-border/60">
              <button
                onClick={() => setPosition(0)}
                className="p-3 text-dark-muted hover:text-white transition"
                title="Restart"
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setPosition(Math.max(position - 15000, 0))}
                  className="p-3 text-dark-muted hover:text-white transition"
                  title="Rewind 15s"
                >
                  <SkipBack className="w-6 h-6" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-14 h-14 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 hover:scale-105 transition"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-0.5" />}
                </button>

                <button
                  onClick={() => setPosition(Math.min(position + 15000, currentTrack.duration))}
                  className="p-3 text-dark-muted hover:text-white transition"
                  title="Forward 15s"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-dark-muted" />
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                  className="w-20 accent-sky-500"
                />
                <span className="text-xs font-mono text-dark-muted w-8">{volume}%</span>
              </div>
            </div>
          </div>

          {/* Audio Filters Matrix */}
          <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Real-Time DSP Audio Filters</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {['none', 'bassboost', 'nightcore', 'vaporwave', '8d', 'karaoke', 'tremolo', 'lowpass'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition ${
                    activeFilter === f
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                      : 'bg-dark-surface border border-dark-border text-dark-muted hover:text-white'
                  }`}
                >
                  {f === 'none' ? 'Normal / Clear' : f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Queue & Search */}
        <div className="space-y-6">
          {/* Add Song Form */}
          <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <Search className="w-4 h-4 text-sky-400" />
              <span>Enqueue Track</span>
            </h3>
            <form onSubmit={handleAddSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Song title or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2 text-xs text-white placeholder-dark-muted focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Up Next Queue */}
          <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Up Next ({queue.length})</h3>
              <span className="text-xs text-dark-muted font-mono">
                {formatTime(queue.reduce((acc, q) => acc + q.duration, 0))}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {queue.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-dark-surface/60 border border-dark-border/60 flex items-center justify-between group hover:border-dark-border transition"
                >
                  <div className="overflow-hidden pr-2">
                    <span className="text-[10px] font-mono text-dark-muted mr-1.5">#{idx + 1}</span>
                    <span className="text-xs font-medium text-white truncate block">{item.title}</span>
                    <span className="text-[11px] text-dark-muted">{item.author}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-[11px] font-mono text-dark-muted">{formatTime(item.duration)}</span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-dark-muted hover:text-rose-400 transition p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {queue.length === 0 && (
                <div className="text-center py-8 text-xs text-dark-muted">
                  The queue is currently empty.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

