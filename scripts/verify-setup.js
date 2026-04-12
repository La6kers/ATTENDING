#!/usr/bin/env node
// ============================================================
// ATTENDING AI - Quick Verification Script
// scripts/verify-setup.js
//
// Verifies all components are properly configured
// Run: node scripts/verify-setup.js
// ============================================================

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function check(condition, successMsg, failMsg) {
  if (condition) {
    log(`  ✅ ${successMsg}`, colors.green);
    return true;
  } else {
    log(`  ❌ ${failMsg}`, colors.red);
    return false;
  }
}

function fileExists(filepath) {
  return fs.existsSync(path.join(process.cwd(), filepath));
}

function dirExists(dirpath) {
  const fullPath = path.join(process.cwd(), dirpath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🏥 ATTENDING AI - Setup Verification                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);

let allPassed = true;

// =====================================================
// Core Files
// =====================================================
log('\n📁 Core Files:', colors.bold);
allPassed &= check(fileExists('package.json'), 'Root package.json exists', 'Missing root package.json');
allPassed &= check(fileExists('.env'), '.env file exists', 'Missing .env file - run: cp .env.example .env');
allPassed &= check(fileExists('prisma/schema.prisma'), 'Prisma schema exists', 'Missing Prisma schema');
allPassed &= check(fileExists('prisma/seed.ts'), 'Database seed script exists', 'Missing seed script');

// =====================================================
// Provider Portal
// =====================================================
log('\n🏥 Provider Portal:', colors.bold);
allPassed &= check(dirExists('apps/provider-portal'), 'Provider portal directory exists', 'Missing provider-portal');
allPassed &= check(fileExists('apps/provider-portal/lib/prisma.ts'), 'Prisma client singleton exists', 'Missing Prisma client - need to create lib/prisma.ts');
allPassed &= check(fileExists('apps/provider-portal/pages/api/assessments/index.ts'), 'Assessments API exists', 'Missing assessments API');
allPassed &= check(fileExists('apps/provider-portal/store/assessmentQueueStore.ts'), 'Assessment store exists', 'Missing assessment store');
allPassed &= check(fileExists('apps/provider-portal/lib/websocket.ts'), 'WebSocket client exists', 'Missing WebSocket client');

// =====================================================
// Patient Portal
// =====================================================
log('\n👤 Patient Portal:', colors.bold);
allPassed &= check(dirExists('apps/patient-portal'), 'Patient portal directory exists', 'Missing patient-portal');
allPassed &= check(fileExists('apps/patient-portal/pages/chat/index.tsx'), 'COMPASS chat page exists', 'Missing COMPASS chat page');
allPassed &= check(fileExists('apps/patient-portal/pages/api/chat/compass.ts'), 'COMPASS API exists', 'Missing COMPASS chat API');
allPassed &= check(fileExists('apps/patient-portal/pages/api/assessments/submit.ts'), 'Assessment submit API exists', 'Missing assessment submit API');

// =====================================================
// Shared Package
// =====================================================
log('\n📦 Shared Package:', colors.bold);
allPassed &= check(dirExists('apps/shared'), 'Shared package exists', 'Missing shared package');
allPassed &= check(fileExists('apps/shared/types/index.ts'), 'Shared types exist', 'Missing shared types');
allPassed &= check(fileExists('apps/shared/machines/assessmentMachine.ts'), 'XState machine exists', 'Missing assessment machine');
allPassed &= check(fileExists('apps/shared/services/index.ts'), 'Shared services exist', 'Missing shared services');

// =====================================================
// WebSocket Service
// =====================================================
log('\n🔌 WebSocket Service:', colors.bold);
allPassed &= check(dirExists('services/notification-service'), 'Notification service directory exists', 'Missing notification service');
allPassed &= check(fileExists('services/notification-service/src/index.ts'), 'WebSocket server exists', 'Missing WebSocket server - need to create');

// =====================================================
// Configuration
// =====================================================
log('\n⚙️  Configuration:', colors.bold);

if (fileExists('.env')) {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  allPassed &= check(envContent.includes('DATABASE_URL'), 'DATABASE_URL configured', 'Missing DATABASE_URL in .env');
  allPassed &= check(envContent.includes('NEXT_PUBLIC_WS_URL'), 'WebSocket URL configured', 'Missing NEXT_PUBLIC_WS_URL in .env');
}

// =====================================================
// Summary
// =====================================================
console.log(`
${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}
`);

if (allPassed) {
  log('🎉 All checks passed! Your setup is complete.', colors.green + colors.bold);
  console.log(`
${colors.cyan}Next steps:${colors.reset}

  1. Initialize the database:
     ${colors.yellow}npx prisma generate${colors.reset}
     ${colors.yellow}npx prisma db push${colors.reset}
     ${colors.yellow}npm run db:seed${colors.reset}

  2. Start development servers:
     ${colors.yellow}npm run dev${colors.reset}           (Both portals)
     ${colors.yellow}npm run dev:all${colors.reset}       (Portals + WebSocket)

  3. Open in browser:
     Provider Portal: ${colors.cyan}http://localhost:3000${colors.reset}
     Patient Portal:  ${colors.cyan}http://localhost:3001${colors.reset}
`);
} else {
  log('\n⚠️  Some checks failed. Please fix the issues above.', colors.yellow + colors.bold);
  console.log(`
${colors.cyan}Quick fixes:${colors.reset}

  • Missing .env: ${colors.yellow}Copy the example and configure${colors.reset}
  • Missing Prisma client: ${colors.yellow}Create apps/provider-portal/lib/prisma.ts${colors.reset}
  • Run setup script: ${colors.yellow}npm run dev:setup${colors.reset}
`);
}
