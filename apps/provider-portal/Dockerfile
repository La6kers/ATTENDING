# ============================================================
# ATTENDING AI - Provider Portal Dockerfile
# apps/provider-portal/Dockerfile
#
# Multi-stage build for Next.js in monorepo context.
# Build context: repository root (.)
# ============================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json turbo.json ./
COPY apps/shared/package.json apps/shared/
COPY apps/provider-portal/package.json apps/provider-portal/

# Install all dependencies (workspace-aware)
RUN npm ci --workspace=apps/provider-portal --workspace=apps/shared --include-workspace-root

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/shared/node_modules ./apps/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/provider-portal/node_modules ./apps/provider-portal/node_modules 2>/dev/null || true

# Copy source
COPY package.json turbo.json tsconfig.json ./
COPY prisma ./prisma
COPY apps/shared ./apps/shared
COPY apps/provider-portal ./apps/provider-portal

# Generate Prisma client
RUN npx prisma generate

# Build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=apps/provider-portal

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/apps/provider-portal/public ./apps/provider-portal/public
COPY --from=builder /app/apps/provider-portal/.next/standalone ./
COPY --from=builder /app/apps/provider-portal/.next/static ./apps/provider-portal/.next/static

# Copy Prisma for runtime queries
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

CMD ["node", "apps/provider-portal/server.js"]
