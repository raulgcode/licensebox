#!/usr/bin/env node

/**
 * Setup script for LicenseBox
 * This script automates the initial project setup
 */

import { execSync } from 'child_process';
import { existsSync, copyFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    // Ensure DATABASE_URL is set for Prisma commands
    const env = {
      ...process.env,
      DATABASE_URL: 'postgresql://licensebox:licensebox_dev@localhost:5432/licensebox_db',
      ...(options.env || {}),
    };
    execSync(command, { stdio: 'inherit', ...options, env });
    return true;
  } catch (error) {
    return false;
  }
}

function checkDocker() {
  log('\n🐳 Checking Docker...', colors.blue);
  const hasDocker = execCommand('docker --version', { stdio: 'pipe' });

  if (!hasDocker) {
    log('❌ Docker is not installed or not running!', colors.red);
    log(
      'Please install Docker Desktop from: https://www.docker.com/products/docker-desktop',
      colors.yellow,
    );
    process.exit(1);
  }

  // Check if Docker daemon is running
  const dockerRunning = execCommand('docker ps', { stdio: 'pipe' });
  if (!dockerRunning) {
    log('❌ Docker is installed but not running!', colors.red);
    log('Please start Docker Desktop and try again.', colors.yellow);
    process.exit(1);
  }

  log('✅ Docker is installed', colors.green);
}

function setupEnvironmentFiles() {
  log('\n📝 Setting up environment files...', colors.blue);

  // API .env file
  const apiEnvPath = join(process.cwd(), 'apps', 'api', '.env');
  const apiEnvExamplePath = join(process.cwd(), 'apps', 'api', '.env.example');

  if (!existsSync(apiEnvPath)) {
    const apiEnvContent = `DATABASE_URL="postgresql://licensebox:licensebox_dev@localhost:5432/licensebox_db"
PORT=3000
NODE_ENV=development
`;
    writeFileSync(apiEnvPath, apiEnvContent);
    writeFileSync(apiEnvExamplePath, apiEnvContent);
    log('✅ Created API .env file', colors.green);
  } else {
    log('⚠️  API .env file already exists, skipping...', colors.yellow);
  }

  // Web .env file
  const webEnvPath = join(process.cwd(), 'apps', 'web', '.env');
  const webEnvExamplePath = join(process.cwd(), 'apps', 'web', '.env.example');

  if (!existsSync(webEnvPath)) {
    const webEnvContent = `VITE_API_URL=http://localhost:3000
`;
    writeFileSync(webEnvPath, webEnvContent);
    writeFileSync(webEnvExamplePath, webEnvContent);
    log('✅ Created Web .env file', colors.green);
  } else {
    log('⚠️  Web .env file already exists, skipping...', colors.yellow);
  }
}

function installDependencies() {
  log('\n📦 Installing dependencies...', colors.blue);

  if (!execCommand('pnpm install')) {
    log('❌ Failed to install dependencies', colors.red);
    process.exit(1);
  }

  log('✅ Dependencies installed', colors.green);
}

function startDatabase() {
  log('\n🚀 Starting PostgreSQL database...', colors.blue);

  // Stop any existing containers
  execCommand('docker-compose down', { stdio: 'pipe' });

  // Start the database
  if (!execCommand('docker-compose up -d postgres')) {
    log('❌ Failed to start database', colors.red);
    process.exit(1);
  }

  log('✅ Database started', colors.green);
  log('⏳ Waiting for database to be ready...', colors.yellow);

  // Wait for database to be ready
  let retries = 30;
  while (retries > 0) {
    const isReady = execCommand('docker-compose exec -T postgres pg_isready -U licensebox', {
      stdio: 'pipe',
    });
    if (isReady) {
      log('✅ Database is ready', colors.green);
      break;
    }
    retries--;
    if (retries === 0) {
      log('❌ Database failed to start in time', colors.red);
      process.exit(1);
    }
    // Cross-platform sleep
    execSync('node -e "setTimeout(() => {}, 2000)"', { stdio: 'pipe' });
  }
}

function setupDatabase() {
  log('\n🗄️  Setting up database schema...', colors.blue);

  const databasePath = join(process.cwd(), 'packages', 'database');

  // Generate Prisma Client using pnpm exec to use local version
  if (!execCommand('pnpm --filter @licensebox/database db:generate')) {
    log('❌ Failed to generate Prisma Client', colors.red);
    process.exit(1);
  }

  // Run migrations
  if (
    !execCommand('pnpm --filter @licensebox/database db:migrate --name init', { cwd: databasePath })
  ) {
    log('❌ Failed to run database migrations', colors.red);
    process.exit(1);
  }

  log('✅ Database schema setup complete', colors.green);
}

async function main() {
  log('\n╔═══════════════════════════════════════╗', colors.blue);
  log('║   🚀 LicenseBox Setup Script 🚀      ║', colors.blue);
  log('╚═══════════════════════════════════════╝\n', colors.blue);

  try {
    checkDocker();
    setupEnvironmentFiles();
    installDependencies();
    startDatabase();
    setupDatabase();

    log('\n╔═══════════════════════════════════════╗', colors.green);
    log('║   ✅ Setup Complete! ✅              ║', colors.green);
    log('╚═══════════════════════════════════════╝\n', colors.green);

    log('📋 Next steps:', colors.blue);
    log('  1. Run: pnpm run dev', colors.yellow);
    log('  2. API will be available at: http://localhost:3000', colors.yellow);
    log('  3. Web will be available at: http://localhost:5173', colors.yellow);
    log('  4. Database GUI: pnpm --filter database db:studio\n', colors.yellow);
  } catch (error) {
    log(`\n❌ Setup failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();
