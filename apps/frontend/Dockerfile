# ============================================================
# Frontend Dockerfile (Next.js)
# Supports: Development (HMR) & Production (standalone)
# ============================================================

# ─── Base ───────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# ─── Deps ───────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY apps/frontend/package.json apps/frontend/package-lock.json* ./
RUN npm install --legacy-peer-deps

# ─── Development (Next.js HMR) ──────────────────────────────
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# Sources overridden by volume mount in compose
COPY apps/frontend/ ./
EXPOSE 4000
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
CMD ["npm", "run", "dev"]

# ─── Builder ────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ─── Production ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 4000
CMD ["node", "server.js"]
