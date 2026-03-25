import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, seedDatabase } from './db/database.js';
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

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/patients', patientsRouter);
app.use('/api/encounters', encountersRouter);
app.use('/api/ai', aiRouter);
app.use('/api/overrides', overridesRouter);
app.use('/api/billing', billingRouter);
app.use('/api/ems', emsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ATTENDING Medical AI',
    websocket_clients: getClientCount(),
  });
});

// Initialize database, WebSocket, then start server
async function start() {
  await initDatabase();
  await seedDatabase();
  initWebSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`ATTENDING backend running on http://localhost:${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
