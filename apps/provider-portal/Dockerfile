# ============================================================
# ATTENDING AI - Provider Portal Dockerfile
# apps/provider-portal/Dockerfile
#
# Multi-stage build for production Next.js deployment.
# Targets Azure App Service (Linux) or any container runtime.
#
# Build:  docker build -f apps/provider-portal/Dockerfile -t attending-provider .
# Run:    docker run -p 3002:3002 --env-file .env.production attending-provider
# ============================================================

# ==========================================================
# Stage 1: Dependencies
# ==========================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for all workspaces
COPY package.json package-lock.json turbo.json ./
COPY apps/provider-portal/package.json ./apps/provider-portal/
COPY apps/shared/package.json ./apps/shared/
COPY prisma/schema.prisma ./prisma/

# Install all dependencies (needed for Prisma generate + build)
RUN npm ci --ignore-scripts
RUN npx prisma generate

# ==========================================================
# Stage 2: Builder
# ==========================================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/provider-portal/node_modules ./apps/provider-portal/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/shared/node_modules ./apps/shared/node_modules 2>/dev/null || true

# Copy source
COPY apps/shared ./apps/shared
COPY apps/provider-portal ./apps/provider-portal
COPY prisma ./prisma
COPY package.json turbo.json tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate

# Build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npx turbo run build --filter=provider-portal

# ==========================================================
# Stage 3: Production Runner
# ==========================================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/apps/provider-portal/public ./apps/provider-portal/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/provider-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/provider-portal/.next/static ./apps/provider-portal/.next/static

# Copy Prisma engine (needed at runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --spider -q http://localhost:3002/api/health || exit 1

CMD ["node", "apps/provider-portal/server.js"]
