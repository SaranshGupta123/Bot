# RAINFALL REST & WEBSOCKET API REFERENCE

Base URL: `http://localhost:4000`  
WebSocket URL: `ws://localhost:4000/ws`

---

## 1. Authentication

All requests to `/api/guilds`, `/api/player`, `/api/playlists`, `/api/user`, and `/api/admin` require a Bearer token:
```http
Authorization: Bearer <jwt_token>
```

### `GET /api/auth/login`
Returns the Discord OAuth2 authorization URL.

### `POST /api/auth/callback`
Exchanges Discord OAuth code for a verified session JWT.
- **Request Body**: `{ "code": "..." }`
- **Response**: `{ "token": "...", "user": { "id": "...", "username": "..." } }`

---

## 2. Guild Management

### `GET /api/guilds`
List all servers where the authenticated user has `MANAGE_GUILD` or `ADMINISTRATOR` permissions.

### `GET /api/guilds/:guildId/config`
Retrieve server configuration (prefix, default volume, DJ role, allowed channels, 24/7 mode, autoplay).

### `PATCH /api/guilds/:guildId/config`
Update server configuration.

---

## 3. Real-Time Player Controls

### `GET /api/player/:guildId`
Retrieve the current snapshot of the Lavalink player (current track, queue, position, volume, repeat mode, active DSP filters).

### `POST /api/player/:guildId/action`
Execute a playback action from the dashboard:
- `play` (resume)
- `pause`
- `skip`
- `seek` (`{ "position": 45000 }`)
- `volume` (`{ "volume": 100 }`)
- `filter` (`{ "preset": "bassboost" }`)
- `shuffle`

---

## 4. WebSocket Feed

Connect to `ws://localhost:4000/ws`.

### Subscribe to Guild
```json
{
  "action": "SUBSCRIBE_GUILD",
  "guildId": "111222333444555666"
}
```

### Event Payload Format
```json
{
  "type": "PLAYER_STATE_CHANGE",
  "guildId": "111222333444555666",
  "payload": { ... },
  "timestamp": 1730370000000
}
```

