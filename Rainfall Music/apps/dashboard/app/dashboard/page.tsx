'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Music, Settings, Radio, Plus, Server, Play, Heart, ListMusic, ChevronRight } from 'lucide-react';

interface MockGuild {
  id: string;
  name: string;
  icon: string | null;
  isPlaying: boolean;
  memberCount: number;
}

export default function DashboardOverviewPage() {
  const [guilds, setGuilds] = useState<MockGuild[]>([
    { id: '111222333444555666', name: 'Astral Lounge', icon: null, isPlaying: true, memberCount: 1420 },
    { id: '222333444555666777', name: 'Rainfall Official Community', icon: null, isPlaying: false, memberCount: 8900 },
    { id: '333444555666777888', name: 'Chill Beats & Gaming', icon: null, isPlaying: true, memberCount: 320 },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Discord Servers</h1>
          <p className="text-dark-muted text-sm mt-1">
            Select a server to manage configurations, DJ roles, or take live control of the music player.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/library"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-dark-card border border-dark-border text-xs font-semibold text-white hover:bg-dark-border transition"
          >
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span>My Library</span>
          </Link>

          <a
            href="https://discord.com/oauth2/authorize?client_id=123456789012345678&permissions=3233856&scope=bot%20applications.commands"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sky-500 text-xs font-semibold text-white hover:bg-sky-600 transition shadow-md shadow-sky-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Another Server</span>
          </a>
        </div>
      </div>

      {/* Guild Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guilds.map((g) => (
          <div
            key={g.id}
            className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border hover:border-sky-500/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 flex items-center justify-center font-bold text-white text-lg shadow-md">
                  {g.name.substring(0, 2).toUpperCase()}
                </div>

                {g.isPlaying ? (
                  <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Stream</span>
                  </span>
                ) : (
                  <span className="text-xs text-dark-muted font-medium">Idle</span>
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{g.name}</h3>
              <p className="text-xs text-dark-muted font-mono">{g.memberCount.toLocaleString()} members</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-dark-border/60">
              <Link
                href={`/dashboard/servers/${g.id}/player`}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-semibold transition"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Player</span>
              </Link>

              <Link
                href={`/dashboard/servers/${g.id}`}
                className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-dark-surface hover:bg-dark-border text-slate-300 text-xs font-semibold transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

