FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages packages
RUN npm ci --workspaces --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/worker apps/worker
RUN npm run build -w @arete/worker

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
CMD ["npm", "run", "start", "-w", "@arete/worker"]
