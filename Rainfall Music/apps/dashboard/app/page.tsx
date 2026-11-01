'use client';

import React from 'react';
import Link from 'next/link';
import {
  Play,
  SkipForward,
  SkipBack,
  Pause,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  RotateCcw,
  Sparkles,
  Sliders,
  ShieldCheck,
  Radio,
  Zap,
  Flame,
  ArrowRight,
  Headphones,
  Compass,
  Heart,
  Mic,
  Shuffle,
  Square,
  Settings,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-sky-600/20 to-indigo-600/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Lavalink v4 Powered Audio Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
          The Next-Generation{' '}
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Discord Music
          </span>{' '}
          Ecosystem
        </h1>

        <p className="text-lg sm:text-xl text-dark-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Transform your Discord voice channels into high-fidelity concert halls. Featuring native interactive message control panels, real-time web playback synchronization, and studio-grade DSP audio filters.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="https://discord.com/oauth2/authorize?client_id=123456789012345678&permissions=3233856&scope=bot%20applications.commands"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-base shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] transition-all flex items-center justify-center space-x-2"
          >
            <span>Add to Discord</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-dark-card border border-dark-border text-white font-semibold text-base hover:bg-dark-border hover:scale-[1.02] transition-all flex items-center justify-center space-x-2"
          >
            <span>Open Web Dashboard</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto p-4 rounded-2xl bg-dark-surface/50 border border-dark-border/80">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">99.98%</div>
            <div className="text-xs text-dark-muted font-medium mt-1">Uptime SLA</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-400">0.05ms</div>
            <div className="text-xs text-dark-muted font-medium mt-1">Audio Buffer Delay</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400">15-Button</div>
            <div className="text-xs text-dark-muted font-medium mt-1">Interactive Control Grid</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-400">Lavalink v4</div>
            <div className="text-xs text-dark-muted font-medium mt-1">Multi-Node Cluster</div>
          </div>
        </div>
      </section>

      {/* Signature Feature Live Showcase: The Discord Message Control Panel */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="w-4 h-4" />
            <span>Signature Feature</span>
          </div>
          <h2 className="text-3xl font-bold text-white">Native Discord Message Control Panel</h2>
          <p className="text-dark-muted mt-2 max-w-xl mx-auto text-sm">
            Compact, native Discord message with Now Playing metadata, song suggestion dropdown, and 3 rows of 5 interactive buttons.
          </p>
        </div>

        {/* Discord Message Replica */}
        <div className="max-w-xl mx-auto bg-[#313338] rounded-2xl p-5 border border-[#3f4147] shadow-2xl">
          {/* Bot Author Line */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white shadow">
              R
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-white text-sm">Rainfall</span>
                <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.2 rounded">BOT</span>
              </div>
              <span className="text-xs text-[#949ba4]">Today at 3:45 PM</span>
            </div>
          </div>

          {/* Now Playing Embed (Section 3.1) */}
          <div className="border-l-4 border-[#38bdf8] bg-[#2b2d31] rounded-r-lg p-4 mb-3">
            <div className="text-xs text-[#949ba4] font-medium mb-1">1 track in queue</div>
            <div className="text-white font-semibold text-base mb-1">🎵 Starboy | Official Audio</div>
            <div className="text-xs text-[#949ba4] font-mono mb-3">[03:46]</div>
            <div className="text-xs text-[#dbdee1] space-y-1">
              <div><span className="text-[#949ba4]">Requested by:</span> <span className="text-sky-400 bg-sky-500/10 px-1 rounded">@Alex</span></div>
              <div><span className="text-[#949ba4]">Volume:</span> 100</div>
            </div>
          </div>

          {/* Song Suggestion Select Menu (Section 3.2) */}
          <div className="mb-4">
            <div className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-lg px-3 py-2.5 flex items-center justify-between text-xs text-[#949ba4] cursor-pointer hover:border-[#5865f2] transition">
              <span>Select a suggested song</span>
              <span>▼</span>
            </div>
          </div>

          {/* 3x5 Interactive Button Grid (Section 3.3) */}
          <div className="space-y-2">
            {/* Row 1 */}
            <div className="grid grid-cols-5 gap-1.5">
              <button className="bg-[#248046] hover:bg-[#1a6334] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">▶️</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">⏮️</button>
              <button className="bg-[#5865f2] hover:bg-[#4752c4] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">⏸️</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">⏭️</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">🔁</button>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-5 gap-1.5">
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">🔉</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">⏪</button>
              <button className="bg-[#da373c] hover:bg-[#a1282c] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">❤️</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">⏩</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">🔊</button>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-5 gap-1.5">
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">🎙️</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">🔀</button>
              <button className="bg-[#da373c] hover:bg-[#a1282c] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">⏹️</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">🎛️</button>
              <button className="bg-[#4e5058] hover:bg-[#6d6f78] text-white py-2 rounded text-xs font-medium flex items-center justify-center transition">⚙️</button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-dark-border">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Engineered Without Compromises</h2>
          <p className="text-dark-muted text-base">
            Every layer of Rainfall is designed for speed, resilience, and user delight.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-dark-card/50 border border-dark-border hover:border-sky-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-6">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">DSP Audio Filter Chain</h3>
            <p className="text-sm text-dark-muted leading-relaxed">
              Bassboost, 8D audio rotation, Nightcore, Vaporwave, Karaoke vocal attenuation, and Equalizer curves processed in real time.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-dark-card/50 border border-dark-border hover:border-indigo-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Smart Autoplay & Radio</h3>
            <p className="text-sm text-dark-muted leading-relaxed">
              Never let the party go silent. The recommendation engine discovers artist-related tracks and seamlessly extends your queue.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-dark-card/50 border border-dark-border hover:border-purple-500/40 transition">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">DJ Roles & Channel Locks</h3>
            <p className="text-sm text-dark-muted leading-relaxed">
              Granular access control, vote skipping, restricted music text channels, and administrator overrides per Discord server.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-900/40 via-indigo-900/40 to-slate-900/60 border border-sky-500/30 p-10 sm:p-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to upgrade your server's sound?
          </h2>
          <p className="text-base text-sky-200/80 max-w-xl mx-auto mb-8">
            Experience the cleanest, most reliable Discord audio system. Zero lag, crystal-clear 320kbps streams.
          </p>
          <a
            href="https://discord.com/oauth2/authorize?client_id=123456789012345678&permissions=3233856&scope=bot%20applications.commands"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition shadow-lg"
          >
            <span>Invite Rainfall Now</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

