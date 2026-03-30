# ============================================================
# COMPASS Standalone — Dockerfile
# Multi-stage build for Next.js in monorepo context.
# Build context: repository root (.)
#
# Build:  docker build -f apps/compass-standalone/Dockerfile -t compass-standalone .
# Run:    docker run -p 3005:3005 compass-standalone
# ============================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/shared/package.json apps/shared/
COPY apps/compass-standalone/package.json apps/compass-standalone/

RUN npm ci --ignore-scripts --workspace=apps/compass-standalone --workspace=apps/shared --include-workspace-root

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/shared/node_modules ./apps/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/compass-standalone/node_modules ./apps/compass-standalone/node_modules 2>/dev/null || true

COPY package.json turbo.json tsconfig.json ./
COPY apps/shared ./apps/shared
COPY apps/compass-standalone ./apps/compass-standalone

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=apps/compass-standalone

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3005
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/compass-standalone/public ./apps/compass-standalone/public 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/apps/compass-standalone/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/compass-standalone/.next/static ./apps/compass-standalone/.next/static

USER nextjs

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3005/ || exit 1

CMD ["node", "apps/compass-standalone/server.js"]
