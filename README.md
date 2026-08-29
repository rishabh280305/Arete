# Arete

## Architecture

- TypeScript monorepo with npm workspaces
- Next.js web app with Clerk authentication
- Expo React Native mobile app
- NestJS API modular monolith
- Worker process for imports, AI generation, notifications, and sync
- Neon Postgres schema with Prisma
- Local development upload storage under `.arete-dev/uploads`
- OpenAI-backed teacher quiz draft generation

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment placeholders if you are setting up a fresh clone:

   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client when you are using a reachable Postgres connection:

   ```bash
   npm run db:generate
   ```

4. Run the API and web app:

   ```bash
   npm run dev -w @arete/api
   npm run dev -w @arete/web
   ```

The web app defaults to `http://localhost:3000`; use another port if 3000 is occupied:

   ```bash
   cd apps/web
   npx next dev -p 3001
   ```

Seeded local accounts use `Arete@12345`:

- `student@arete.local`
- `teacher@arete.local`
- `parent@arete.local`
- `admin@arete.local`
- `owner@arete.local`

Clerk is configured for the development application. Use the landing page role picker, then sign in with Google or open a seeded local workspace.

## Deployment

The repo is linked to Vercel project `arete` and the GitHub remote is `https://github.com/rishabh280305/Arete.git`.

The web app build is configured in `vercel.json`. Production deployment should be completed after the API has a public HTTPS URL and production Clerk keys are available. Set:

- `NEXT_PUBLIC_API_BASE_URL`
- `API_BASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `INTERNAL_API_SECRET`

## Mobile API URL

Expo defaults to `http://localhost:4000/api/v1`. For Android emulator or a physical device, point the app at the reachable host:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api/v1 npm run dev -w @arete/mobile
```

Use your machine LAN IP for a physical device on the same network.

Never commit real secrets. `.env.example` contains placeholders only.
