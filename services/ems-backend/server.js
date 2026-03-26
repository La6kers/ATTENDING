import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { initDatabase, seedDatabase, getDb } from './db/database.js';
import { initWebSocket, getClientCount } from './services/websocket.js';
import patientsRouter from './routes/patients.js';
import encountersRouter from './routes/encounters.js';
import aiRouter from './routes/ai.js';
import overridesRouter from './routes/overrides.js';
import billingRouter from './routes/billing.js';
import emsRouter from './routes/ems.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '..', '.env') });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CORS — restrictive in production
app.use(cors(IS_PRODUCTION ? {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
} : undefined));

app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/patients', patientsRouter);
app.use('/api/encounters', encountersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/overrides', overridesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/ems', emsRouter);

// Health check — Azure App Service uses this to determine container readiness
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'ATTENDING Medical AI',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    websocket_clients: getClientCount(),
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  // Check database connectivity
  try {
    const db = await getDb();
    db.exec('SELECT 1');
    health.database = 'connected';
  } catch (err) {
    health.database = 'error';
    health.status = 'degraded';
  }

  // Check Claude API key presence (not the key itself)
  health.ai_service = process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured';

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Azure liveness probe (minimal, fast)
app.get('/health/live', (req, res) => {
  res.status(200).send('OK');
});

// Azure readiness probe (checks dependencies)
app.get('/health/ready', async (req, res) => {
  try {
    const db = await getDb();
    db.exec('SELECT 1');
    res.status(200).send('READY');
  } catch {
    res.status(503).send('NOT READY');
  }
});

// In production, serve the built frontend as static files
if (IS_PRODUCTION) {
  const frontendDist = resolve(__dirname, '..', 'frontend', 'dist');
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // SPA fallback — any non-API route serves index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/') && !req.path.startsWith('/ws') && !req.path.startsWith('/health')) {
        res.sendFile(join(frontendDist, 'index.html'));
      }
    });
    console.log(`Serving frontend from ${frontendDist}`);
  }
}

// Initialize database, WebSocket, then start server
async function start() {
  await initDatabase();
  await seedDatabase();
  initWebSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`ATTENDING backend running on http://localhost:${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
