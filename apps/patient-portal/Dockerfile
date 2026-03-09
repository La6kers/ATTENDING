# ============================================================
# ATTENDING AI - Patient Portal (COMPASS) Dockerfile
# apps/patient-portal/Dockerfile
#
# Multi-stage build for Next.js in monorepo context.
# Build context: repository root (.)
# ============================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/shared/package.json apps/shared/
COPY apps/patient-portal/package.json apps/patient-portal/

RUN npm ci --workspace=apps/patient-portal --workspace=apps/shared --include-workspace-root

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/shared/node_modules ./apps/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/patient-portal/node_modules ./apps/patient-portal/node_modules 2>/dev/null || true

COPY package.json turbo.json tsconfig.json ./
COPY prisma ./prisma
COPY apps/shared ./apps/shared
COPY apps/patient-portal ./apps/patient-portal

RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=apps/patient-portal

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/patient-portal/public ./apps/patient-portal/public
COPY --from=builder /app/apps/patient-portal/.next/standalone ./
COPY --from=builder /app/apps/patient-portal/.next/static ./apps/patient-portal/.next/static

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3001/api/health || exit 1

CMD ["node", "apps/patient-portal/server.js"]
