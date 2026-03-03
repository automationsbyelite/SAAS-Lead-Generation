# ============================================================
# Backend Dockerfile (NestJS)
# Supports: Development (hot-reload) & Production
# ============================================================

# ─── Base ───────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# ─── Deps ───────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# Root workspace manifests
COPY package.json package-lock.json tsconfig.json ./
# App & package manifests
COPY apps/backend/package.json ./apps/backend/
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai-call/package.json ./packages/ai-call/
# Install everything at root (resolves all workspace deps)
RUN npm install --legacy-peer-deps

# ─── Development (hot-reload via nest start --watch) ────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app ./
# Manifests & configs
COPY package.json package-lock.json tsconfig.json ./
COPY apps/backend/package.json apps/backend/nest-cli.json apps/backend/tsconfig.json ./apps/backend/
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai-call/package.json ./packages/ai-call/
# Sources (overridden by volume mount in compose)
COPY apps/backend/src ./apps/backend/src
COPY packages/shared ./packages/shared
COPY packages/ai-call ./packages/ai-call
# Install ts-node, nodemon and NestJS CLI globally for hot-reload in dev
RUN npm install -g nodemon ts-node tsconfig-paths @nestjs/cli --legacy-peer-deps
WORKDIR /app/apps/backend
EXPOSE 3000
# Use nodemon + ts-node to run source directly — no dist path issues
CMD ["nodemon", "--watch", "src", "--ext", "ts", "--exec", "ts-node -r tsconfig-paths/register src/main.ts"]

# ─── Builder ────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY package.json package-lock.json tsconfig.json ./
COPY apps/backend ./apps/backend
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared ./packages/shared
COPY packages/ai-call ./packages/ai-call
WORKDIR /app/apps/backend
RUN npm install --legacy-peer-deps
RUN npx nest build

# ─── Production ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/dist ./dist
RUN npm install --omit=dev --legacy-peer-deps
EXPOSE 3000
CMD ["node", "dist/main"]
