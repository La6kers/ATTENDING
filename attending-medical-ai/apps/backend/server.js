import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, seedDatabase } from './db/database.js';
import patientsRouter from './routes/patients.js';
import encountersRouter from './routes/encounters.js';
import aiRouter from './routes/ai.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/patients', patientsRouter);
app.use('/api/encounters', encountersRouter);
app.use('/api/ai', aiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ATTENDING Medical AI' });
});

// Initialize database then start server
async function start() {
  await initDatabase();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`ATTENDING backend running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
