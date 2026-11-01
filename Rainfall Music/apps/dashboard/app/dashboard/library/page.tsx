'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ListMusic, History, Play, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export default function LibraryPage() {
  const [tab, setTab] = useState<'favorites' | 'playlists' | 'history'>('favorites');
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [favorites, setFavorites] = useState([
    { id: '1', title: 'Starboy', author: 'The Weeknd', duration: 230000 },
    { id: '2', title: 'Get Lucky', author: 'Daft Punk', duration: 248000 },
    { id: '3', title: 'Something About Us', author: 'Daft Punk', duration: 232000 },
  ]);

  const [playlists, setPlaylists] = useState([
    { id: '1', name: 'Late Night Coding', trackCount: 24, isPublic: true },
    { id: '2', name: 'Synthwave Chill', trackCount: 15, isPublic: false },
  ]);

  const [history, setHistory] = useState([
    { id: '1', title: 'Starboy', author: 'The Weeknd', playedAt: '12 minutes ago' },
    { id: '2', title: 'One More Time', author: 'Daft Punk', playedAt: '45 minutes ago' },
    { id: '3', title: 'Resonance', author: 'HOME', playedAt: '2 hours ago' },
  ]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    setPlaylists([
      ...playlists,
      { id: Date.now().toString(), name: newPlaylistName.trim(), trackCount: 0, isPublic: false },
    ]);
    setNewPlaylistName('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs text-dark-muted hover:text-white transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Music Library</h1>
        <p className="text-dark-muted text-sm mt-1">
          Manage your personal saved favorites, custom playlists, and recent listening history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-border mb-8">
        <button
          onClick={() => setTab('favorites')}
          className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition ${
            tab === 'favorites'
              ? 'border-pink-500 text-pink-400'
              : 'border-transparent text-dark-muted hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Favorites ({favorites.length})</span>
        </button>

        <button
          onClick={() => setTab('playlists')}
          className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition ${
            tab === 'playlists'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-dark-muted hover:text-white'
          }`}
        >
          <ListMusic className="w-4 h-4" />
          <span>Playlists ({playlists.length})</span>
        </button>

        <button
          onClick={() => setTab('history')}
          className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition ${
            tab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-dark-muted hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Listening History</span>
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'favorites' && (
        <div className="space-y-3">
          {favorites.map((fav, i) => (
            <div
              key={fav.id}
              className="p-4 rounded-2xl bg-dark-card/60 border border-dark-border flex items-center justify-between hover:border-pink-500/40 transition"
            >
              <div className="flex items-center space-x-4">
                <span className="font-mono text-xs text-dark-muted">{i + 1}</span>
                <div>
                  <h4 className="text-sm font-bold text-white">{fav.title}</h4>
                  <p className="text-xs text-dark-muted">{fav.author}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-xs font-mono text-dark-muted">{formatTime(fav.duration)}</span>
                <button
                  onClick={() => setFavorites(favorites.filter((f) => f.id !== fav.id))}
                  className="text-dark-muted hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'playlists' && (
        <div className="space-y-6">
          <form onSubmit={handleCreatePlaylist} className="flex gap-3 max-w-md">
            <input
              type="text"
              placeholder="New playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create</span>
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border hover:border-sky-500/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-dark-muted font-mono">{pl.trackCount} tracks</span>
                    <span className="text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded">
                      {pl.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{pl.name}</h4>
                </div>

                <div className="pt-4 border-t border-dark-border/60 flex items-center justify-between mt-6">
                  <button className="flex items-center space-x-1 text-xs text-sky-400 font-semibold hover:underline">
                    <Play className="w-3.5 h-3.5 fill-sky-400" />
                    <span>Play in Voice</span>
                  </button>
                  <button
                    onClick={() => setPlaylists(playlists.filter((p) => p.id !== pl.id))}
                    className="text-dark-muted hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-dark-card/60 border border-dark-border flex items-center justify-between"
            >
              <div>
                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                <p className="text-xs text-dark-muted">{item.author}</p>
              </div>
              <span className="text-xs font-mono text-dark-muted">{item.playedAt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

