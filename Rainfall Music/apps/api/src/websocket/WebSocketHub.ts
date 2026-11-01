import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { WebSocketMessage, WebSocketEventType } from '@rainfall/types';
import { createScopedLogger } from '@rainfall/shared';

const log = createScopedLogger('WebSocketHub');

interface ClientSubscription {
  ws: WebSocket;
  guildId?: string;
  userId?: string;
}

export class WebSocketHub {
  private wss: WebSocketServer;
  private clients = new Set<ClientSubscription>();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupListeners();
  }

  private setupListeners(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const sub: ClientSubscription = { ws };
      this.clients.add(sub);
      log.debug(`WebSocket client connected. Active connections: ${this.clients.size}`);

      ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.action === 'SUBSCRIBE_GUILD' && parsed.guildId) {
            sub.guildId = parsed.guildId;
            log.debug(`Client subscribed to guild updates: ${sub.guildId}`);
          }
        } catch {
          // ignore invalid packets
        }
      });

      ws.on('close', () => {
        this.clients.delete(sub);
        log.debug(`WebSocket client disconnected. Remaining: ${this.clients.size}`);
      });

      ws.on('error', (err) => {
        log.warn(`WebSocket client error: ${err.message}`);
      });
    });
  }

  public broadcastToGuild<T>(guildId: string, event: WebSocketEventType, payload: T): void {
    const message: WebSocketMessage<T> = {
      type: event,
      guildId,
      payload,
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && (!client.guildId || client.guildId === guildId)) {
        client.ws.send(serialized);
      }
    }
  }

  public broadcastGlobal<T>(event: WebSocketEventType, payload: T): void {
    const message: WebSocketMessage<T> = {
      type: event,
      payload,
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  }
}

