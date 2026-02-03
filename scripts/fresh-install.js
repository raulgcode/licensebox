#!/usr/bin/env node

/**
 * Fresh Install script for LicenseBox
 * This script removes all installed dependencies, caches, and environment files
 * Then runs the setup script from scratch
 */

import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    return false;
  }
}

function removePath(path, description) {
  if (existsSync(path)) {
    try {
      rmSync(path, { recursive: true, force: true });
      log(`✅ Removed ${description}`, colors.green);
      return true;
    } catch (error) {
      log(`⚠️  Failed to remove ${description}: ${error.message}`, colors.yellow);
      return false;
    }
  } else {
    log(`⚠️  ${description} not found, skipping...`, colors.yellow);
    return false;
  }
}

function stopDockerContainers() {
  log('\n🐳 Stopping Docker containers...', colors.blue);

  // Stop and remove all containers
  execCommand('docker-compose down -v', { stdio: 'pipe' });

  log('✅ Docker containers stopped and removed', colors.green);
}

function cleanNodeModules() {
  log('\n🧹 Cleaning node_modules...', colors.blue);

  const rootNodeModules = join(process.cwd(), 'node_modules');
  const apiNodeModules = join(process.cwd(), 'apps', 'api', 'node_modules');
  const webNodeModules = join(process.cwd(), 'apps', 'web', 'node_modules');
  const databaseNodeModules = join(process.cwd(), 'packages', 'database', 'node_modules');
  const sharedNodeModules = join(process.cwd(), 'packages', 'shared', 'node_modules');

  removePath(rootNodeModules, 'root node_modules');
  removePath(apiNodeModules, 'API node_modules');
  removePath(webNodeModules, 'Web node_modules');
  removePath(databaseNodeModules, 'Database node_modules');
  removePath(sharedNodeModules, 'Shared node_modules');
}

function cleanLockFiles() {
  log('\n🧹 Cleaning lock files...', colors.blue);

  const rootLock = join(process.cwd(), 'pnpm-lock.yaml');
  const apiLock = join(process.cwd(), 'apps', 'api', 'pnpm-lock.yaml');
  const webLock = join(process.cwd(), 'apps', 'web', 'pnpm-lock.yaml');

  removePath(rootLock, 'root pnpm-lock.yaml');
  removePath(apiLock, 'API pnpm-lock.yaml');
  removePath(webLock, 'Web pnpm-lock.yaml');
}

function cleanBuildArtifacts() {
  log('\n🧹 Cleaning build artifacts...', colors.blue);

  const apiDist = join(process.cwd(), 'apps', 'api', 'dist');
  const webDist = join(process.cwd(), 'apps', 'web', 'dist');
  const webBuild = join(process.cwd(), 'apps', 'web', 'build');
  const databaseDist = join(process.cwd(), 'packages', 'database', 'dist');
  const sharedDist = join(process.cwd(), 'packages', 'shared', 'dist');
  const turboCache = join(process.cwd(), '.turbo');

  removePath(apiDist, 'API dist');
  removePath(webDist, 'Web dist');
  removePath(webBuild, 'Web build');
  removePath(databaseDist, 'Database dist');
  removePath(sharedDist, 'Shared dist');
  removePath(turboCache, 'Turbo cache');
}

function cleanPrismaArtifacts() {
  log('\n🧹 Cleaning Prisma artifacts...', colors.blue);

  const prismaClient = join(process.cwd(), 'packages', 'database', 'node_modules', '.prisma');
  const prismaGenerated = join(process.cwd(), 'packages', 'database', 'prisma', 'generated');

  removePath(prismaClient, 'Prisma client');
  removePath(prismaGenerated, 'Prisma generated files');
}

function cleanEnvironmentFiles() {
  log('\n🧹 Cleaning environment files...', colors.blue);

  const rootEnv = join(process.cwd(), '.env');
  const webEnv = join(process.cwd(), 'apps', 'web', '.env');
  const webEnvExample = join(process.cwd(), 'apps', 'web', '.env.example');

  removePath(rootEnv, 'root .env');
  removePath(webEnv, 'Web .env');
  removePath(webEnvExample, 'Web .env.example');
}

function cleanPnpmStore() {
  log('\n🧹 Cleaning pnpm store...', colors.blue);

  if (execCommand('pnpm store prune', { stdio: 'pipe' })) {
    log('✅ pnpm store pruned', colors.green);
  } else {
    log('⚠️  Failed to prune pnpm store', colors.yellow);
  }
}

function runSetup() {
  log('\n🚀 Running setup script...', colors.magenta);

  const setupScript = join(__dirname, 'setup.js');
  if (!execCommand(`node "${setupScript}"`)) {
    log('❌ Setup script failed', colors.red);
    process.exit(1);
  }
}

async function main() {
  log('\n╔═══════════════════════════════════════╗', colors.magenta);
  log('║   🔥 LicenseBox Fresh Install 🔥     ║', colors.magenta);
  log('╚═══════════════════════════════════════╝\n', colors.magenta);

  log('⚠️  WARNING: This will remove all installed dependencies,', colors.red);
  log('   caches, build artifacts, environment files, and database!', colors.red);
  log('   Press Ctrl+C to cancel within the next 5 seconds...\n', colors.red);

  // Wait 5 seconds to give user time to cancel
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    stopDockerContainers();
    cleanNodeModules();
    cleanLockFiles();
    cleanBuildArtifacts();
    cleanPrismaArtifacts();
    cleanEnvironmentFiles();
    cleanPnpmStore();

    log('\n╔═══════════════════════════════════════╗', colors.green);
    log('║   ✅ Cleanup Complete! ✅            ║', colors.green);
    log('╚═══════════════════════════════════════╝\n', colors.green);

    runSetup();
  } catch (error) {
    log(`\n❌ Fresh install failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();
