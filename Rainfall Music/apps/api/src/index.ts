import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from '@rainfall/config';
import { createScopedLogger } from '@rainfall/shared';
import { WebSocketHub } from './websocket/WebSocketHub';
import { PlayerController } from './controllers/playerController';

// Route Handlers
import authRoutes from './routes/authRoutes';
import guildRoutes from './routes/guildRoutes';
import playerRoutes from './routes/playerRoutes';
import playlistRoutes from './routes/playlistRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';

const log = createScopedLogger('ApiServer');

export function createServer() {
  const app = express();
  const server = http.createServer(app);
  const wsHub = new WebSocketHub(server);

  PlayerController.setWebSocketHub(wsHub);

  // Middleware
  app.use(cors({
    origin: config.API_CORS_ORIGIN || '*',
    credentials: true,
  }));
  app.use(express.json());

  // Healthcheck endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: Date.now(),
      service: 'rainfall-api',
      uptime: process.uptime(),
    });
  });

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/guilds', guildRoutes);
  app.use('/api/player', playerRoutes);
  app.use('/api/playlists', playlistRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);

  return { app, server, wsHub };
}

if (require.main === module) {
  const { server } = createServer();
  const port = config.API_PORT || 4000;
  server.listen(port, () => {
    log.info(`Rainfall REST & WebSocket API listening on http://${config.API_HOST}:${port}`);
    log.info(`WebSocket endpoint live at ws://${config.API_HOST}:${port}/ws`);
  });
}

