# ============================================================
# ATTENDING AI - Production Dockerfile
#
# Multi-stage build for Azure App Service deployment:
#   Stage 1: Install dependencies
#   Stage 2: Build frontend (Vite/React)
#   Stage 3: Production runtime (backend serves static frontend)
#
# Azure App Service expects a single container listening on $PORT
# ============================================================

# --- Stage 1: Dependencies ---
FROM node:20-slim AS deps
WORKDIR /app

# Copy workspace root + package files for both workspaces
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# --- Stage 2: Build frontend ---
FROM deps AS frontend-build
WORKDIR /app

COPY apps/frontend/ apps/frontend/

# Build the Vite React app
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace=apps/frontend

# --- Stage 3: Production runtime ---
FROM node:20-slim AS production
WORKDIR /app

# Security: run as non-root
RUN groupadd -r attending && useradd -r -g attending attending

# Copy workspace root package files
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/

# Install production dependencies only
RUN npm ci --workspace=apps/backend --omit=dev

# Copy backend source
COPY apps/backend/ apps/backend/

# Copy built frontend static files
COPY --from=frontend-build /app/apps/frontend/dist apps/frontend/dist

# Copy scripts (seed data, setup)
COPY scripts/ scripts/

# Create data directory for SQLite (dev/demo mode)
RUN mkdir -p /app/data && chown -R attending:attending /app/data

# Azure App Service sets PORT env var
ENV NODE_ENV=production
ENV PORT=8080

# Health check for Azure
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Switch to non-root user
USER attending

EXPOSE 8080

CMD ["node", "apps/backend/server.js"]
