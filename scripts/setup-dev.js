#!/usr/bin/env node
/**
 * ATTENDING AI - Development Setup Script
 * Run: node scripts/setup-dev.js
 * 
 * This script sets up the development environment:
 * 1. Checks for required dependencies
 * 2. Generates Prisma client
 * 3. Checks database connection
 * 4. Runs seed data
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '═'.repeat(60));
  log(message, 'cyan');
  console.log('═'.repeat(60));
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function runCommand(command, options = {}) {
  try {
    execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || process.cwd()
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  header('🏥 ATTENDING AI - Development Setup');
  
  const rootDir = path.resolve(__dirname, '..');
  process.chdir(rootDir);
  
  // Step 1: Check Node.js version
  info('Checking Node.js version...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion >= 18) {
    success(`Node.js ${nodeVersion} detected`);
  } else {
    error(`Node.js 18+ required. You have ${nodeVersion}`);
    process.exit(1);
  }

  // Step 2: Check if node_modules exists
  info('Checking dependencies...');
  if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
    warning('Dependencies not installed. Running npm install...');
    if (!runCommand('npm install')) {
      error('Failed to install dependencies');
      process.exit(1);
    }
    success('Dependencies installed');
  } else {
    success('Dependencies already installed');
  }

  // Step 3: Install notification service dependencies
  info('Setting up notification service...');
  const wsServiceDir = path.join(rootDir, 'services', 'notification-service');
  if (!fs.existsSync(path.join(wsServiceDir, 'node_modules'))) {
    warning('Installing notification service dependencies...');
    if (!runCommand('npm install', { cwd: wsServiceDir })) {
      warning('Failed to install notification service deps (non-critical)');
    } else {
      success('Notification service dependencies installed');
    }
  } else {
    success('Notification service ready');
  }

  // Step 4: Generate Prisma client
  header('🔧 Setting up Prisma');
  info('Generating Prisma client...');
  if (runCommand('npx prisma generate --schema=prisma/schema.prisma')) {
    success('Prisma client generated');
  } else {
    warning('Prisma generate failed - database may need setup');
  }

  // Step 5: Check database connection
  info('Checking database connection...');
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
    if (dbUrlMatch) {
      const dbUrl = dbUrlMatch[1];
      if (dbUrl.startsWith('postgresql://')) {
        info(`Database URL: ${dbUrl.replace(/:[^@]+@/, ':***@')}`);
        
        // Try to push schema
        if (runCommand('npx prisma db push --schema=prisma/schema.prisma --skip-generate', { silent: true })) {
          success('Database schema synced');
          
          // Run seed
          info('Seeding database...');
          if (runCommand('npm run db:seed')) {
            success('Database seeded with test data');
          } else {
            warning('Database seed failed - you may need to run manually');
          }
        } else {
          warning('Could not connect to database');
          info('Make sure PostgreSQL is running on localhost:5432');
          info('Or run: docker run --name attending-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=attending_dev -p 5432:5432 -d postgres:15');
        }
      } else if (dbUrl.startsWith('file:')) {
        info('SQLite database configured');
        if (runCommand('npx prisma db push --schema=prisma/schema.prisma')) {
          success('SQLite database created');
        }
      }
    }
  } else {
    warning('.env file not found');
  }

  // Final Summary
  header('📋 Setup Complete!');
  console.log(`
To start development:

  ${colors.cyan}npm run dev${colors.reset}         - Start both portals (patient: 3001, provider: 3002)
  ${colors.cyan}npm run dev:all${colors.reset}     - Start portals + WebSocket service
  ${colors.cyan}npm run db:studio${colors.reset}   - Open Prisma Studio to view data

Portal URLs:
  Patient Portal:  ${colors.green}http://localhost:3001${colors.reset}
  Provider Portal: ${colors.green}http://localhost:3002${colors.reset}
  WebSocket:       ${colors.green}http://localhost:3003${colors.reset}

If database isn't working, ensure PostgreSQL is running or switch to SQLite:
  1. Edit .env: DATABASE_URL="file:./dev.db"
  2. Run: npm run db:push
`);
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
