import React from 'react';
import {
  Music,
  Sliders,
  Radio,
  Shield,
  Layers,
  Sparkles,
  Server,
  Zap,
  Volume2,
  ListMusic,
  Heart,
  Repeat,
} from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      title: 'Signature Discord Message Control Panel',
      description: 'An interactive message directly inside your Discord channel containing real-time Now Playing metadata, a song suggestion dropdown, and exactly 3 rows of 5 interactive buttons.',
      icon: Layers,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
    },
    {
      title: 'Lavalink v4 Audio Cluster',
      description: 'Distributed multi-node audio streaming with automatic failover, latency weighting, and lossless Opus 320kbps audio encoding.',
      icon: Server,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Real-Time DSP Filters',
      description: 'Native audio manipulation filters: Bassboost with multi-band EQ, 8D rotating audio, Nightcore, Vaporwave, and Karaoke vocal elimination.',
      icon: Sliders,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Smart Autoplay & Radio Mode',
      description: 'Intelligent metadata matching and artist radio mode that guarantees continuous playback when the queue finishes.',
      icon: Radio,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Role-Based Access & DJ Mode',
      description: 'Configurable DJ roles, voting skips with customizable thresholds, channel restrictions, and developer overrides.',
      icon: Shield,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
    {
      title: 'Personal Playlists & Favorites',
      description: 'Create private or public playlists, save favorite tracks with the heart button, and replay them anytime across any server.',
      icon: Heart,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Architected For Audio Perfection
        </h1>
        <p className="text-dark-muted text-lg">
          Rainfall is designed from the ground up to replace clunky bots with a modern, responsive, and robust audio platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="p-8 rounded-2xl bg-dark-card/60 border border-dark-border hover:border-sky-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className={`w-12 h-12 rounded-xl ${f.bgColor} ${f.color} flex items-center justify-center mb-6`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                <p className="text-sm text-dark-muted leading-relaxed">{f.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

