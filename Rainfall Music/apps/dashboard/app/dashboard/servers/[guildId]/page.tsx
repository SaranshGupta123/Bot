'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Shield, Volume2, Hash, Radio, Check, Sparkles } from 'lucide-react';

export default function ServerConfigPage({ params }: { params: { guildId: string } }) {
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    prefix: '!',
    defaultVolume: 100,
    djRoleId: '',
    twentyFourSeven: false,
    autoplay: true,
    voteSkipEnabled: true,
    voteSkipThreshold: 50,
    allowedChannels: '',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs text-dark-muted hover:text-white transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Servers</span>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Server Configuration</h1>
            <p className="text-xs text-dark-muted font-mono mt-1">Guild ID: {params.guildId}</p>
          </div>
          <Link
            href={`/dashboard/servers/${params.guildId}/player`}
            className="px-4 py-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold hover:bg-sky-500/20 transition"
          >
            Open Live Player
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border space-y-4">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
            <Radio className="w-4 h-4 text-sky-400" />
            <span>General Playback Settings</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Text Command Prefix</label>
              <input
                type="text"
                value={config.prefix}
                maxLength={5}
                onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
                className="w-full bg-dark-surface border border-dark-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Default Starting Volume (1-150%)</label>
              <input
                type="number"
                min={1}
                max={150}
                value={config.defaultVolume}
                onChange={(e) => setConfig({ ...config, defaultVolume: parseInt(e.target.value, 10) || 100 })}
                className="w-full bg-dark-surface border border-dark-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-dark-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-dark-surface/40 hover:bg-dark-surface transition">
              <input
                type="checkbox"
                checked={config.autoplay}
                onChange={(e) => setConfig({ ...config, autoplay: e.target.checked })}
                className="rounded border-dark-border text-sky-500 focus:ring-0"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Smart Autoplay</span>
                <span className="text-xs text-dark-muted">Automatically queue related songs when queue finishes</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl bg-dark-surface/40 hover:bg-dark-surface transition">
              <input
                type="checkbox"
                checked={config.twentyFourSeven}
                onChange={(e) => setConfig({ ...config, twentyFourSeven: e.target.checked })}
                className="rounded border-dark-border text-sky-500 focus:ring-0"
              />
              <div>
                <span className="text-sm font-semibold text-white block">24/7 Presence</span>
                <span className="text-xs text-dark-muted">Remain connected even when voice channel is empty</span>
              </div>
            </label>
          </div>
        </div>

        {/* Access Control & Permissions */}
        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border space-y-4">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Permissions & Access Control</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">DJ Role ID</label>
              <input
                type="text"
                placeholder="Discord Role Snowflake (e.g. 1029384756)"
                value={config.djRoleId}
                onChange={(e) => setConfig({ ...config, djRoleId: e.target.value })}
                className="w-full bg-dark-surface border border-dark-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Vote Skip Threshold (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={config.voteSkipThreshold}
                onChange={(e) => setConfig({ ...config, voteSkipThreshold: parseInt(e.target.value, 10) || 50 })}
                className="w-full bg-dark-surface border border-dark-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Restricted Command Channels (Comma-separated channel IDs)</label>
            <input
              type="text"
              placeholder="Leave empty to permit commands in all channels"
              value={config.allowedChannels}
              onChange={(e) => setConfig({ ...config, allowedChannels: e.target.value })}
              className="w-full bg-dark-surface border border-dark-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end space-x-4">
          {saved && (
            <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold">
              <Check className="w-4 h-4" />
              <span>Configuration saved successfully!</span>
            </span>
          )}
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm shadow-md shadow-sky-500/20 hover:opacity-95 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}

