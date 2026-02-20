# ============================================================
# ATTENDING AI - Provider Portal Production Dockerfile
# apps/provider-portal/Dockerfile
#
# Multi-stage build for minimal, secure production image:
#   Stage 1 (deps):     Install dependencies
#   Stage 2 (builder):  Build Next.js
#   Stage 3 (runner):   Minimal runtime image
#
# Security features:
#   - Non-root user (nextjs:nodejs)
#   - Read-only filesystem compatible
#   - No dev dependencies in final image
#   - Minimal Alpine base
#   - Health check built in
#
# Build:
#   docker build -f apps/provider-portal/Dockerfile -t attending-provider .
#
# Run:
#   docker run -p 3000:3000 --env-file .env.production attending-provider
# ============================================================

# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY apps/shared/package.json ./apps/shared/
COPY apps/provider-portal/package.json ./apps/provider-portal/
COPY packages/clinical-types/package.json ./packages/clinical-types/ 2>/dev/null || true
COPY packages/clinical-services/package.json ./packages/clinical-services/ 2>/dev/null || true
COPY packages/ui-primitives/package.json ./packages/ui-primitives/ 2>/dev/null || true

# Install dependencies
RUN npm ci --ignore-scripts

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build:provider

# ---- Stage 3: Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install runtime-only dependencies
RUN apk add --no-cache \
    wget \
    ca-certificates \
    tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy only what's needed for runtime
COPY --from=builder /app/apps/provider-portal/next.config.js ./apps/provider-portal/
COPY --from=builder /app/apps/provider-portal/public ./apps/provider-portal/public
COPY --from=builder /app/apps/provider-portal/.next/standalone ./
COPY --from=builder /app/apps/provider-portal/.next/static ./apps/provider-portal/.next/static

# Copy Prisma client (needed at runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma/schema.prisma ./prisma/

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

# Use tini as init process (proper signal handling for graceful shutdown)
ENTRYPOINT ["tini", "--"]

# Start the Next.js server
CMD ["node", "apps/provider-portal/server.js"]
