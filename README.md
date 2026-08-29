# Arete

## Architecture

- TypeScript monorepo with npm workspaces
- Next.js web app
- Expo React Native mobile app
- NestJS API modular monolith
- Worker process for imports, AI generation, notifications, and sync
- PostgreSQL with Prisma
- Redis-backed background jobs
- S3-compatible private object storage
- OpenAI behind a provider abstraction

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment placeholders:

   ```bash
   cp .env.example .env
   ```

3. Start local infrastructure:

   ```bash
   docker compose -f infra/docker/docker-compose.yml up -d
   ```

4. Generate Prisma client:

   ```bash
   npm run db:generate
   ```

5. Run the apps:

   ```bash
   npm run dev
   ```

## Mobile API URL

Expo defaults to `http://localhost:4000/api/v1`. For Android emulator or a physical device, point the app at the reachable host:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api/v1 npm run dev -w @arete/mobile
```

Use your machine LAN IP for a physical device on the same network.

Never commit real secrets. `.env.example` contains placeholders only.
