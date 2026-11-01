'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Radio, CheckCircle2, RefreshCw } from 'lucide-react';

export default function StatusPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    gateway: { status: 'Operational', latency: '24ms' },
    nodes: [
      { id: 'Main-Node-1', status: 'Operational', host: 'localhost:2333', players: 14, memory: '342 MB / 2048 MB', uptime: '14d 6h' },
      { id: 'Secondary-Node-2', status: 'Standby / Failover', host: 'localhost:2334', players: 0, memory: '112 MB / 2048 MB', uptime: '14d 6h' },
    ],
    database: { status: 'Operational', latency: '2ms' },
    redis: { status: 'Operational', latency: '1ms' },
    uptimePercentage: '99.98%',
  });

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Status & Cluster Health</h1>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-dark-card border border-dark-border text-xs text-white hover:bg-dark-border transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="text-xs text-dark-muted font-medium mb-1">Overall Availability</div>
          <div className="text-3xl font-extrabold text-emerald-400">{data.uptimePercentage}</div>
          <div className="text-xs text-slate-400 mt-2">Past 90 days rolling uptime</div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="text-xs text-dark-muted font-medium mb-1">Discord Gateway Latency</div>
          <div className="text-3xl font-extrabold text-sky-400">{data.gateway.latency}</div>
          <div className="text-xs text-slate-400 mt-2">Realtime WebSocket heartbeat</div>
        </div>

        <div className="p-6 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="text-xs text-dark-muted font-medium mb-1">Database & Cache Latency</div>
          <div className="text-3xl font-extrabold text-indigo-400">{data.database.latency}</div>
          <div className="text-xs text-slate-400 mt-2">PostgreSQL & Redis connection</div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <Server className="w-5 h-5 text-sky-400" />
        <span>Lavalink v4 Audio Nodes</span>
      </h2>

      <div className="space-y-4">
        {data.nodes.map((node) => (
          <div
            key={node.id}
            className="p-6 rounded-2xl bg-dark-card/50 border border-dark-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-white text-base">{node.id}</span>
                <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                  {node.status}
                </span>
              </div>
              <div className="text-xs text-dark-muted font-mono mt-1">{node.host}</div>
            </div>

            <div className="flex items-center space-x-6 text-xs text-dark-muted">
              <div>
                <span className="text-slate-400 block font-medium">Active Players</span>
                <span className="text-white font-mono font-semibold">{node.players}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Memory Usage</span>
                <span className="text-white font-mono font-semibold">{node.memory}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Uptime</span>
                <span className="text-white font-mono font-semibold">{node.uptime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

