# ============================================================
# Worker Dockerfile (NestJS Application Context)
# Supports: Development (nodemon + ts-node) & Production
# ============================================================

# ─── Base ───────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# ─── Deps ───────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai-call/package.json ./packages/ai-call/
RUN npm install --legacy-peer-deps

# ─── Development (nodemon + ts-node for hot-reload) ─────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Manifests & tsconfigs
COPY package.json package-lock.json tsconfig.json ./
COPY apps/worker/package.json apps/worker/tsconfig.json apps/worker/tsconfig.build.json ./apps/worker/
COPY apps/backend/package.json apps/backend/tsconfig.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai-call/package.json ./packages/ai-call/
# Sources (overridden by volume mounts in compose)
COPY apps/worker/src ./apps/worker/src
COPY apps/backend/src ./apps/backend/src
COPY packages/shared ./packages/shared
COPY packages/ai-call ./packages/ai-call
# Install nodemon + ts-node globally for hot-reload
RUN npm install -g nodemon ts-node tsconfig-paths --legacy-peer-deps
CMD [ \
  "nodemon", \
  "--watch", "apps/worker/src", \
  "--watch", "apps/backend/src", \
  "--watch", "packages", \
  "--ext", "ts", \
  "--exec", "ts-node -r tsconfig-paths/register -P apps/worker/tsconfig.build.json apps/worker/src/main.ts" \
]

# ─── Builder ────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY apps/worker ./apps/worker
COPY apps/backend/src ./apps/backend/src
COPY apps/backend/tsconfig.json ./apps/backend/
COPY packages/shared ./packages/shared
COPY packages/ai-call ./packages/ai-call
WORKDIR /app/apps/worker
RUN npm run build

# ─── Production ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/package.json ./
CMD ["node", "dist/apps/worker/src/main.js"]
