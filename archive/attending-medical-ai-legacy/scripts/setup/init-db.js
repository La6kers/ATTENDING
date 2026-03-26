import { initDatabase, seedDatabase } from '../../apps/backend/db/database.js';

async function main() {
  console.log('Initializing ATTENDING database...');
  await initDatabase();
  await seedDatabase();
  console.log('Database ready.');
}

main().catch(err => {
  console.error('Init failed:', err);
  process.exit(1);
});
