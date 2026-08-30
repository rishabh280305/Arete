FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages packages
RUN npm ci --workspaces --include-workspace-root

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/api apps/api
RUN npm run db:generate
RUN npm run build -w @arete/types \
  && npm run build -w @arete/validation \
  && npm run build -w @arete/config \
  && npm run build -w @arete/permissions \
  && npm run build -w @arete/auth \
  && npm run build -w @arete/integrations \
  && npm run build -w @arete/ai \
  && npm run build -w @arete/observability \
  && npm run build -w @arete/database \
  && npm run build -w @arete/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@arete/api"]
