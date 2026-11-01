import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { redis } from '@rainfall/shared';
import { LoopMode, AudioFilter, WebSocketEventType } from '@rainfall/types';
import type { WebSocketHub } from '../websocket/WebSocketHub';

export class PlayerController {
  private static wsHub: WebSocketHub | null = null;

  public static setWebSocketHub(hub: WebSocketHub): void {
    this.wsHub = hub;
  }

  public static async getPlayerState(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { guildId } = req.params;

    try {
      const state = await redis.get(`player_state:${guildId}`);
      if (!state) {
        res.json({
          player: null,
          message: 'No active player session for this guild',
        });
        return;
      }

      res.json({ player: JSON.parse(state) });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to retrieve player state', message: (err as Error).message });
    }
  }

  public static async executeAction(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { guildId } = req.params;
    const { action, payload } = req.body;

    if (!action) {
      res.status(400).json({ error: 'Player action is required (play, pause, skip, seek, volume, filter, shuffle)' });
      return;
    }

    try {
      // Broadcast control event to Redis queue for bot consumption
      const eventPayload = {
        guildId,
        userId: req.user?.id,
        action,
        payload,
        timestamp: Date.now(),
      };

      await redis.publish(`player_commands:${guildId}`, JSON.stringify(eventPayload));

      // Also notify WebSocket subscribers
      if (this.wsHub) {
        this.wsHub.broadcastToGuild(guildId, WebSocketEventType.PLAYER_STATE_CHANGE, eventPayload);
      }

      res.json({ success: true, action, guildId });
    } catch (err: unknown) {
      res.status(500).json({ error: 'Failed to execute player command', message: (err as Error).message });
    }
  }
}

