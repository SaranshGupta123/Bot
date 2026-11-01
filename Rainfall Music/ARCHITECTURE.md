# ARCHITECTURE SPECIFICATION: RAINFALL DISCORD MUSIC ECOSYSTEM

## 1. System Overview & Philosophy

The **Rainfall Music Ecosystem** is an enterprise-grade, distributed Discord audio and management platform. It bridges high-fidelity audio streaming (powered by Lavalink v4 clusters) with real-time Discord UX (interactive live-updating voice control panels) and a full-stack Next.js web dashboard synchronized via WebSocket feeds.

```
                    ┌─────────────────────────┐
                    │      DISCORD GATEWAY    │
                    └───────────┬─────────────┘
                                │ (WS/Events)
                                ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                       APPS / BOT (Discord.js v14)                │
 │  ┌─────────────────────────────────────────────────────────────┐ │
 │  │      Unified Command Dispatcher (Slash & Prefix Handler)    │ │
 │  │        ├── Command Middleware (Perms, DJ, Voice State)       │ │
 │  │        └── Autocomplete & Error Handler                     │ │
 │  └──────────────────────────────┬──────────────────────────────┘ │
 │                                 │                                │
 │  ┌──────────────────────────────▼──────────────────────────────┐ │
 │  │      Audio Engine Service (Lavalink Manager & Queue)        │ │
 │  │        ├── Node Failover & Load Balancer                    │ │
 │  │        ├── Filter Chain & DSP Processing                    │ │
 │  │        └── Smart Autoplay & Recommendation Resolver         │ │
 │  └──────────────────────────────┬──────────────────────────────┘ │
 │                                 │                                │
 │  ┌──────────────────────────────▼──────────────────────────────┐ │
 │  │  Signature Interactive Discord Music Control Panel Service   │ │
 │  │        ├── Now Playing Minimalist Embed                     │ │
 │  │        ├── Song Suggestion StringSelectMenu                 │ │
 │  │        ├── 3 Rows x 5 Buttons Interactive Grid (15 Buttons) │ │
 │  │        ├── Filter & Settings Submenus                       │ │
 │  │        └── Session Restoration & Message ID Cache           │ │
 │  └──────────────────────────────┬──────────────────────────────┘ │
 └─────────────────────────────────┼────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │  LAVALINK v4     │  │  POSTGRESQL      │  │  REDIS CLUSTER   │
   │  CLUSTER         │  │  (Prisma ORM)    │  │  (ioredis)       │
   │  LavaSrc/Search  │  │  State & Config  │  │  Cache & PubSub  │
   └──────────────────┘  └──────────────────┘  └──────────────────┘
              ▲                    ▲                    ▲
              │                    │                    │
 ┌────────────┴────────────────────┴────────────────────┴───────────┐
 │                       APPS / API (Express & WS)                  │
 │  ├── REST Endpoints (Guilds, Controls, Playlists, Analytics)     │
 │  ├── Discord OAuth2 Authorization & JWT Session Manager          │
 │  └── Realtime WebSocket Broadcast Service                        │
 └─────────────────────────────────┬────────────────────────────────┘
                                   │ (REST & WS)
                                   ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                    APPS / DASHBOARD (Next.js 14)                 │
 │  ├── Public Landing, Docs, and Bot Inviter                       │
 │  ├── Guild Management & Audio Player Controls                    │
 │  ├── Personal Library (Favorites, Playlists, Analytics)          │
 │  └── Super-Admin Monitoring (Nodes, Sockets, Audits)             │
 └──────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
rainfall-music-ecosystem/
├── apps/
│   ├── bot/                 # Discord.js bot application
│   │   ├── src/
│   │   │   ├── commands/     # Slash and prefix command definitions
│   │   │   │   ├── music/
│   │   │   │   ├── config/
│   │   │   │   ├── playlists/
│   │   │   │   ├── user/
│   │   │   │   └── admin/
│   │   │   ├── events/       # Discord gateway & client event listeners
│   │   │   ├── interactions/ # Button, select menu, modal handlers
│   │   │   ├── services/     # Music manager, panel manager, queue manager
│   │   │   ├── middleware/   # Authorization, DJ role checks, channel restrictions
│   │   │   ├── utils/        # Embed builders, time formatting, error handlers
│   │   │   └── index.ts      # Main bot entry point
│   │   └── package.json
│   ├── api/                 # REST & WebSocket API backend
│   │   ├── src/
│   │   │   ├── controllers/  # Route handlers
│   │   │   ├── routes/       # API route definitions
│   │   │   ├── middleware/   # OAuth2 auth, rate limiters, validation
│   │   │   ├── websocket/    # Live playback sync hub
│   │   │   └── index.ts
│   │   └── package.json
│   └── dashboard/           # Next.js web application
│       ├── app/             # App router pages (dashboard, server, admin)
│       ├── components/      # UI components, audio controls, layout
│       ├── hooks/           # WebSocket hooks, auth hooks, player hooks
│       ├── lib/             # API client, auth helpers, utilities
│       └── package.json
├── packages/
│   ├── types/               # Shared TypeScript typings and contracts
│   ├── config/              # Centralized configuration schema & validation
│   ├── database/            # Prisma schema, client, and migrations
│   └── shared/              # Winston logger, Redis client, embed builders
├── infrastructure/
│   ├── lavalink/            # Lavalink v4 application.yml, plugins
│   ├── docker/              # Dockerfiles and compose configs
│   └── monitoring/          # Prometheus & Grafana definitions
├── docs/
├── package.json
├── tsconfig.base.json
└── .env.example
```

---

## 3. Core Architectural Decisions

### 3.1 Unified Command Dispatcher
To prevent logic drift between Prefix (`!play`) and Slash (`/play`), both route through an abstract `CommandContext`. The context normalizes:
- User, Member, Guild, Channel
- Text and Option parameters
- `reply`, `defer`, `editReply`, `followUp` operations with ephemeral support
- Channel typing indicators

### 3.2 Signature Discord Music Control Panel Architecture
The interactive voice channel panel in text chats is a native Discord message-based interface:
- **Now Playing Minimalist Embed**:
  - Queue count ("1 track in queue")
  - Title, author, duration, music source
  - Requester mention (`@User`)
  - Volume indicator & playback status thumbnail
- **Song Suggestion Select Menu**:
  - Discord `StringSelectMenuBuilder` placed directly below the embed.
  - Placeholder: `"Select a suggested song"`.
  - Dynamically resolved related tracks with title, artist, and formatted duration.
  - Selecting adds the track directly to the queue with ephemeral feedback.
- **Three-Row 15-Button Matrix (3x5 Grid)**:
  - **Row 1**: [ ▶️ Play/Resume ] [ ⏮️ Previous ] [ ⏸️ Pause ] [ ⏭️ Skip ] [ 🔁 Loop ]
  - **Row 2**: [ 🔉 Vol Down ] [ ⏪ Seek Back (-15s) ] [ ❤️ Favourite ] [ ⏩ Seek Fwd (+15s) ] [ 🔊 Vol Up ]
  - **Row 3**: [ 🎙️ Voice Effects ] [ 🔀 Shuffle ] [ ⏹️ Stop ] [ 🎛️ Filters ] [ ⚙️ Settings ]
- **Interactive Modals & Menus**:
  - Filter modal/select menu (Bassboost, Nightcore, Vaporwave, 8D, Karaoke, Tremolo, Vibrato, Lowpass, Equalizer)
  - Settings interactive menu (Default Volume, Autoplay, DJ Mode, Vote Skip, 24/7)
  - Voice Effects interactive menu (Pitch, Speed, Echo, Chorus)
- **Progress & Rate-Limit Optimization**:
  - State edits are debounced (interval 5-6s) to ensure zero 429 Discord Gateway rate limits.
  - Stored in Redis & PostgreSQL for restart recovery.
  - Auto-recreation on message deletion.
  - Voice channel & DJ permission verification on button clicks with ephemeral error notices.

### 3.3 Audio Player & Node Clustering
- Built on `lavalink-client` v2 with Lavalink v4.
- Automatic failover across defined nodes with priority weighting and latency scoring.
- Spotify resolution maps to YouTube Music / SoundCloud queries using ISRC and track metadata matching.
- DSP Filters: Bassboost, Nightcore, Vaporwave, 8D, Tremolo, Vibrato, Karaoke, Equalizer bands.

### 3.4 Data Persistence & Session Recovery
- PostgreSQL stores long-term entities: Users, Guilds, ServerConfigs, Playlists, Favorites, Audit Logs, DJ Roles.
- Redis acts as a high-speed L1 cache: Player state snapshots, Queue history, Rate limit buckets, Active Control Panel state.
- Player restoration mechanism: On clean/unexpected restarts, active queues are read from Redis/Postgres and player instances are systematically reconstructed.

---

## 4. Key Technical Risks & Mitigations

1. **Discord API 429 Rate Limits**:
   - *Risk*: Editing panel embeds every second exhausts channel rate limits (5 per 5 seconds).
   - *Mitigation*: Debounce updates to 5-10 second intervals during steady playback; update immediately only on user interaction or track transitions.

2. **Lavalink Node Disconnects**:
   - *Risk*: Node drops sever audio streams in all active guilds.
   - *Mitigation*: Multi-node pooling with automatic failover to healthy secondary nodes and reconnect backoff.

3. **Simultaneous Queue Modification Race Conditions**:
   - *Risk*: Two users clicking 'Skip' or 'Shuffle' at the exact same millisecond corrupts queue pointers.
   - *Mitigation*: Mutex locking per guild queue in memory / Redis during queue mutations.

4. **Discord OAuth2 Impersonation**:
   - *Risk*: Malicious web dashboard requests targeting unauthorized guilds.
   - *Mitigation*: Cryptographically signed JWT session tokens validated against Discord's `users/@me/guilds` permission bitfield (`MANAGE_GUILD` or `ADMINISTRATOR`) on every privileged API call.

