'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music, LayoutDashboard, Terminal, Activity, BookOpen, Sparkles, LogIn, User } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('rainfall_user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const navLinks = [
    { name: 'Features', href: '/features', icon: Sparkles },
    { name: 'Commands', href: '/commands', icon: Terminal },
    { name: 'Docs', href: '/docs', icon: BookOpen },
    { name: 'Status', href: '/status', icon: Activity },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-dark-border bg-dark-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
              Rainfall
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded">
              v4.0
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-sky-400 bg-sky-500/10'
                    : 'text-dark-muted hover:text-white hover:bg-dark-surface'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Auth CTA */}
        <div className="flex items-center space-x-3">
          <a
            href="https://discord.com/oauth2/authorize?client_id=123456789012345678&permissions=3233856&scope=bot%20applications.commands"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-dark-card hover:bg-dark-border border border-dark-border rounded-xl transition-all hover:scale-[1.02]"
          >
            <span>Invite Bot</span>
          </a>

          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-dark-card border border-dark-border hover:border-sky-500/40 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {user.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-medium text-white hidden sm:inline">{user.username}</span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl hover:opacity-90 transition-all shadow-md shadow-sky-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with Discord</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

