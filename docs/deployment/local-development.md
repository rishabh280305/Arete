# Local Development

Arete currently runs the web app and API locally while using Clerk for web authentication and a Neon-linked env for the production database target.

```bash
npm install
npm run dev -w @arete/api
npm run dev -w @arete/web
```

If port 3000 is already occupied:

```bash
cd apps/web
npx next dev -p 3001
```

Current local behavior:

- Seeded accounts are created through `POST /api/v1/auth/dev/seed`.
- Demo/local sessions use `POST /api/v1/auth/login`.
- Clerk sessions exchange through `POST /api/arete/session`, then `POST /api/v1/auth/clerk/session`.
- Teacher uploads write to `.arete-dev/uploads`.
- AI quiz drafts call OpenAI when `OPENAI_API_KEY` is present and return editable fallback drafts if the provider call fails.

Production recommendation:

- Vercel for the Next.js web app.
- A container host such as Railway, Render, or Fly.io for the NestJS API and worker.
- Neon Postgres for durable data.
- Vercel Blob as the practical replacement for Cloudflare R2 when deploying on Vercel, or Neon object storage if the Neon plan/service supports the needed usage.

The Vercel project is linked, but do not deploy the public web app with `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`; the deployed browser cannot reach your local API.

Avoid committing `.env`. Use real secret storage in production.
