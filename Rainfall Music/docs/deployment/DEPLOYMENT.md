# RAINFALL DEPLOYMENT & OPERATIONS GUIDE

## 1. Prerequisites

- **Node.js**: v20+ or v22+
- **Docker & Docker Compose**: v2.20+
- **Discord Bot Token**: Application registered on the [Discord Developer Portal](https://discord.com/developers/applications) with:
  - `Message Content Intent` (Enabled)
  - `Server Members Intent` (Enabled)
  - `Presence Intent` (Enabled)
- **Lavalink v4**: Java 17+ (or pre-packaged container `ghcr.io/lavalink-devs/lavalink:4`)

---

## 2. Fast Deployment via Docker Compose

1. Clone the repository:
   ```bash
   git clone <repo_url>
   cd "Discord Rainfall Music Bot"
   ```

2. Configure environment credentials:
   ```bash
   cp .env.example .env
   # Edit .env and supply DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, etc.
   ```

3. Start the entire ecosystem:
   ```bash
   docker compose -f infrastructure/docker/docker-compose.yml up -d --build
   ```

4. Verify cluster health:
   - Dashboard: `http://localhost:3000`
   - REST API: `http://localhost:4000/health`
   - Lavalink: `http://localhost:2333`

---

## 3. Local Development Mode

To run each application directly with hot reloading:

```bash
# 1. Install all monorepo dependencies
npm install

# 2. Generate Prisma Client
npm run db:generate

# 3. Build shared packages
npm run build

# 4. Launch Bot
npm run bot:dev

# 5. Launch API Server
npm run api:dev

# 6. Launch Web Dashboard
npm run dashboard:dev
```

---

## 4. Slash Command Deployment

To push all 37 application slash commands to Discord's global command registry:

```bash
npm run deploy-commands --workspace=@rainfall/bot
```

---

## 5. Security & Secret Best Practices

- **Zero Exposure**: Never commit `.env` or application logs to git.
- **Audit Logs**: All administrative actions (config changes, blacklist modifications, DJ role updates) are recorded in the PostgreSQL `audit_logs` table.
- **JWT Cryptography**: Dashboard requests require a cryptographically signed HMAC SHA-256 JWT containing verified Discord snowflake IDs.

