# Local Development

Use Docker Compose for PostgreSQL, Redis, and MinIO.

```bash
docker compose -f infra/docker/docker-compose.yml up -d
npm install
npm run db:generate
npm run dev
```

For production, the first recommended low-cost deployment is:

- Managed PostgreSQL
- Managed Redis where affordable, or single-node Redis initially
- S3-compatible storage such as Cloudflare R2, AWS S3, or Backblaze B2
- A small container host for API and worker
- Static/edge hosting for Next.js where supported

Avoid committing `.env`. Use real secret storage in production.
