# ============================================================
# ATTENDING AI - WebSocket Service Dockerfile
# services/websocket/Dockerfile
#
# Real-time communication service for emergency alerts
# ============================================================

FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache curl

# Copy package files
COPY services/websocket/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY services/websocket/ ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 websocket
RUN chown -R websocket:nodejs /app

USER websocket

# Expose WebSocket port
EXPOSE 3003

ENV NODE_ENV=production
ENV WS_PORT=3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Start the service
CMD ["node", "server.ts"]
