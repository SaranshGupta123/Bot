import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Rainfall | Next-Generation Discord Music Ecosystem',
  description: 'Enterprise-grade Discord music bot and web controller powered by Lavalink v4, voice channel control panels, and real-time dashboard.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-dark-bg text-dark-text antialiased selection:bg-sky-500/30 selection:text-sky-200">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

