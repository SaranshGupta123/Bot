import React from 'react';
import Link from 'next/link';
import { Music, Github, Disc as DiscordIcon, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-dark-border bg-dark-bg mt-auto py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Rainfall</span>
            </div>
            <p className="text-sm text-dark-muted leading-relaxed">
              Next-generation high-fidelity Discord music ecosystem powered by Lavalink v4 clusters and native interactive control panels.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-dark-muted">
              <li><Link href="/features" className="hover:text-white transition">Features</Link></li>
              <li><Link href="/commands" className="hover:text-white transition">Commands List</Link></li>
              <li><Link href="/status" className="hover:text-white transition">Cluster Status</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition">Web Controller</Link></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-dark-muted">
              <li><Link href="/docs" className="hover:text-white transition">Documentation</Link></li>
              <li><a href="https://discord.com" target="_blank" rel="noreferrer" className="hover:text-white transition">Support Discord</a></li>
              <li><a href="https://lavalink.dev" target="_blank" rel="noreferrer" className="hover:text-white transition">Lavalink v4 Specs</a></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Legal & Architecture</h4>
            <ul className="space-y-2 text-sm text-dark-muted">
              <li><span className="text-dark-muted">Terms of Service</span></li>
              <li><span className="text-dark-muted">Privacy Policy</span></li>
              <li><Link href="/admin" className="hover:text-white transition">Super-Admin Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-dark-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-dark-muted">
          <p>© 2026 Rainfall Music Ecosystem. Built with strict TypeScript, Lavalink v4, and Next.js.</p>
          <p className="flex items-center space-x-1 mt-2 sm:mt-0">
            <span>Engineered with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500" />
            <span>for elite Discord communities</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

