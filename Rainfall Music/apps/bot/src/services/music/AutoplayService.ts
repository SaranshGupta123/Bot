import { Player, Track } from 'lavalink-client';
import { createScopedLogger } from '@rainfall/shared';
import type { MusicManager } from './MusicManager';

const log = createScopedLogger('AutoplayService');

export class AutoplayService {
  constructor(private musicManager: MusicManager) {}

  public async getSuggestions(player: Player, count: number = 5): Promise<Track[]> {
    const currentTrack = player.queue.current;
    if (!currentTrack) return [];

    try {
      const requester = (currentTrack.userData as any)?.requester || { id: 'autoplay', username: 'Autoplay Engine' };
      // 1. Try resolving related tracks from YouTube Music / YouTube using the artist and title
      const searchQuery = `${currentTrack.info.author} related tracks`;
      const searchRes = await this.musicManager.search(
        searchQuery,
        requester
      );

      if (!searchRes || !searchRes.tracks || searchRes.tracks.length === 0) {
        // Fallback search by author
        const fallbackRes = await this.musicManager.search(
          `${currentTrack.info.author} top tracks`,
          requester
        );
        return (fallbackRes?.tracks || []).slice(0, count);
      }

      // Filter out tracks that are identical to current or in recent previous queue
      const previousIdentifiers = new Set(
        (player.queue.previous || []).map((t) => t.info.identifier)
      );
      previousIdentifiers.add(currentTrack.info.identifier);

      const filtered = searchRes.tracks.filter(
        (t) => !previousIdentifiers.has(t.info.identifier)
      );

      return filtered.slice(0, count);
    } catch (err: unknown) {
      log.warn(`Failed to resolve track suggestions for ${currentTrack.info.title}: ${(err as Error).message}`);
      return [];
    }
  }

  public async resolveNextAutoplayTrack(player: Player): Promise<Track | null> {
    const suggestions = await this.getSuggestions(player, 5);
    if (suggestions.length > 0) {
      return suggestions[0];
    }
    return null;
  }
}
