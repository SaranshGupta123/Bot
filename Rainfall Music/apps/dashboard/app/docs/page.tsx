import React from 'react';
import { BookOpen, Terminal, CheckCircle2, Server, HelpCircle } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">Documentation & Setup</h1>
        <p className="text-dark-muted text-base">
          Get started with Rainfall in your Discord server or self-host your own dedicated cluster.
        </p>
      </div>

      <div className="space-y-12">
        {/* Step 1 */}
        <section className="p-8 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 font-bold flex items-center justify-center">1</div>
            <h2 className="text-xl font-bold text-white">Invite the Bot</h2>
          </div>
          <p className="text-sm text-dark-muted leading-relaxed mb-4">
            Add Rainfall to your Discord server using the official OAuth2 authorization link. Make sure to grant the requested permissions so the bot can join voice channels and post the interactive message control panel.
          </p>
          <a
            href="https://discord.com/oauth2/authorize?client_id=123456789012345678&permissions=3233856&scope=bot%20applications.commands"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition"
          >
            Authorize Rainfall
          </a>
        </section>

        {/* Step 2 */}
        <section className="p-8 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center">2</div>
            <h2 className="text-xl font-bold text-white">Join a Voice Channel & Play</h2>
          </div>
          <p className="text-sm text-dark-muted leading-relaxed mb-4">
            Connect to any voice channel in your Discord server, then run either a slash command or a prefix command:
          </p>
          <div className="p-4 rounded-xl bg-[#090a0f] border border-dark-border font-mono text-sm text-sky-400 mb-4">
            /play query: Bohemian Rhapsody<br />
            <span className="text-dark-muted"># Or using the prefix:</span><br />
            !play Bohemian Rhapsody
          </div>
          <p className="text-sm text-dark-muted leading-relaxed">
            The bot will connect to your voice channel and automatically deploy the signature 15-button control panel with track suggestions into your text channel.
          </p>
        </section>

        {/* Step 3 */}
        <section className="p-8 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 font-bold flex items-center justify-center">3</div>
            <h2 className="text-xl font-bold text-white">Configure Server Preferences</h2>
          </div>
          <p className="text-sm text-dark-muted leading-relaxed mb-4">
            Server administrators can configure custom prefixes, designate DJ roles, or lock commands to specific channels:
          </p>
          <div className="p-4 rounded-xl bg-[#090a0f] border border-dark-border font-mono text-xs text-slate-300 space-y-1">
            <div><span className="text-sky-400">/prefix</span> new_prefix: ? <span className="text-dark-muted"># Changes prefix to ?</span></div>
            <div><span className="text-sky-400">/djrole</span> role: @DJ <span className="text-dark-muted"># Assigns DJ role</span></div>
            <div><span className="text-sky-400">/allowedchannels</span> action: Add Current Channel <span className="text-dark-muted"># Restricts commands</span></div>
            <div><span className="text-sky-400">/247</span> <span className="text-dark-muted"># Keeps bot in voice 24/7</span></div>
          </div>
        </section>

        {/* Step 4 */}
        <section className="p-8 rounded-2xl bg-dark-card/60 border border-dark-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center">4</div>
            <h2 className="text-xl font-bold text-white">Self-Hosting With Docker Compose</h2>
          </div>
          <p className="text-sm text-dark-muted leading-relaxed mb-4">
            Rainfall is designed for effortless deployment with Docker Compose. The stack includes the Discord bot, the REST & WebSocket API, the Next.js dashboard, PostgreSQL, Redis, and a Lavalink v4 node:
          </p>
          <div className="p-4 rounded-xl bg-[#090a0f] border border-dark-border font-mono text-xs text-emerald-400 mb-2">
            git clone &lt;repo&gt;<br />
            cp .env.example .env<br />
            docker compose -f infrastructure/docker/docker-compose.yml up -d
          </div>
        </section>
      </div>
    </div>
  );
}

