'use client';

import React, { useState } from 'react';
import { ShieldAlert, Server, Activity, Power, AlertTriangle, Users, HardDrive } from 'lucide-react';

export default function AdminPage() {
  const [maintenance, setMaintenance] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Super-Admin Administration</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Infrastructure & Operations</h1>
        </div>

        {/* Maintenance Toggle Button */}
        <button
          onClick={() => setMaintenance(!maintenance)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition ${
            maintenance
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
              : 'bg-dark-card border border-dark-border text-slate-300 hover:text-white'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{maintenance ? 'Maintenance Mode: ACTIVE' : 'Enable Maintenance Mode'}</span>
        </button>
      </div>

      {maintenance && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center space-x-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>Maintenance mode is active. Public Discord commands and web dashboard requests are restricted.</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="text-xs text-dark-muted font-medium mb-1">Total Servers</div>
          <div className="text-2xl font-bold text-white">1,480</div>
          <div className="text-xs text-slate-400 mt-2 font-mono">+12 today</div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="text-xs text-dark-muted font-medium mb-1">Active Streams</div>
          <div className="text-2xl font-bold text-sky-400">42</div>
          <div className="text-xs text-slate-400 mt-2 font-mono">320kbps Opus</div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="text-xs text-dark-muted font-medium mb-1">Process Heap Memory</div>
          <div className="text-2xl font-bold text-indigo-400">142 MB</div>
          <div className="text-xs text-slate-400 mt-2 font-mono">Node.js {process.version}</div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="text-xs text-dark-muted font-medium mb-1">Lavalink Cluster</div>
          <div className="text-2xl font-bold text-emerald-400">2 / 2 Healthy</div>
          <div className="text-xs text-slate-400 mt-2 font-mono">0 failovers</div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
        <h2 className="text-lg font-bold text-white mb-4">Security & Action Audit Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-dark-muted font-mono">
            <thead className="border-b border-dark-border text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Target Guild</th>
                <th className="pb-3">User ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40">
              <tr>
                <td className="py-3 text-slate-300">2026-10-31 15:42:10</td>
                <td><span className="text-sky-400">UPDATE_CONFIG</span></td>
                <td>111222333444555666</td>
                <td>123456789012345678</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-300">2026-10-31 15:39:04</td>
                <td><span className="text-indigo-400">SET_DJ_ROLE</span></td>
                <td>222333444555666777</td>
                <td>123456789012345678</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-300">2026-10-31 15:30:15</td>
                <td><span className="text-emerald-400">NODE_HEALTHCHECK_PASS</span></td>
                <td>Cluster Primary</td>
                <td>System Worker</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

