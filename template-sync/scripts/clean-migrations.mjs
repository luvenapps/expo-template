#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch {
    return '';
  }
}

function checkSupabaseRunning() {
  // Check for Docker containers with 'supabase' in the name
  const containers = exec('docker ps --format "{{.Names}}" 2>/dev/null || true');
  const supabaseContainers = containers
    .split('\n')
    .filter((name) => name.includes('supabase') && name.trim() !== '');

  if (supabaseContainers.length > 0) {
    return { running: true, containers: supabaseContainers };
  }

  // Also check for supabase CLI processes
  const processes = exec('ps aux | grep -i supabase | grep -v grep || true');
  if (processes.trim() !== '') {
    return { running: true, containers: ['supabase CLI process'] };
  }

  return { running: false, containers: [] };
}

function checkExpoRunning() {
  // Check for expo/metro processes
  const processes = exec('ps aux | grep -E "(expo|metro)" | grep -v grep || true');
  const lines = processes.split('\n').filter((line) => line.trim() !== '');

  if (lines.length > 0) {
    return { running: true, processCount: lines.length };
  }

  return { running: false, processCount: 0 };
}

function findMigrationFiles() {
  const paths = {
    sqliteMigrations: join(rootDir, 'src/db/sqlite/migrations'),
    sqliteMeta: join(rootDir, 'src/db/sqlite/migrations/meta'),
    postgresMigrations: join(rootDir, 'supabase/migrations'),
    postgresMeta: join(rootDir, 'supabase/migrations/meta'),
  };

  const files = {
    sqliteMigrations: [],
    sqliteMeta: [],
    postgresMigrations: [],
    postgresMeta: [],
  };

  // SQLite migrations (exclude meta directory)
  if (existsSync(paths.sqliteMigrations)) {
    files.sqliteMigrations = readdirSync(paths.sqliteMigrations, { withFileTypes: true })
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.sql'))
      .map((dirent) => join(paths.sqliteMigrations, dirent.name));
  }

  // SQLite meta files
  if (existsSync(paths.sqliteMeta)) {
    files.sqliteMeta = readdirSync(paths.sqliteMeta)
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(paths.sqliteMeta, name));
  }

  // Postgres migrations (exclude README.md and .example files)
  if (existsSync(paths.postgresMigrations)) {
    files.postgresMigrations = readdirSync(paths.postgresMigrations, { withFileTypes: true })
      .filter(
        (dirent) =>
          dirent.isFile() &&
          dirent.name.endsWith('.sql') &&
          !dirent.name.endsWith('.example') &&
          dirent.name !== 'README.md',
      )
      .map((dirent) => join(paths.postgresMigrations, dirent.name));
  }

  // Postgres meta files
  if (existsSync(paths.postgresMeta)) {
    files.postgresMeta = readdirSync(paths.postgresMeta)
      .filter((name) => name.endsWith('.json'))
      .map((name) => join(paths.postgresMeta, name));
  }

  return files;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  log('\n╔═══════════════════════════════════════════════════════════╗', colors.bold);
  log('║          🧹 MIGRATION CLEANUP SCRIPT                     ║', colors.bold);
  log('╚═══════════════════════════════════════════════════════════╝\n', colors.bold);

  log('⚠️  WARNING: This will DELETE all migration files!\n', colors.red + colors.bold);

  // Check if services are running
  const supabase = checkSupabaseRunning();
  const expo = checkExpoRunning();

  let hasWarnings = false;

  if (supabase.running) {
    hasWarnings = true;
    log('🔴 SUPABASE IS RUNNING!', colors.red + colors.bold);
    log('   The following containers/processes are active:', colors.yellow);
    supabase.containers.forEach((name) => {
      log(`   • ${name}`, colors.yellow);
    });
    log('   Recommendation: Stop Supabase before cleaning migrations.', colors.yellow);
    log('   Run: Ctrl+C in the terminal running Supabase, or `npx supabase stop`\n', colors.cyan);
  }

  if (expo.running) {
    hasWarnings = true;
    log('🔴 EXPO/METRO IS RUNNING!', colors.red + colors.bold);
    log(`   Found ${expo.processCount} expo/metro process(es)`, colors.yellow);
    log('   Recommendation: Stop Expo before cleaning migrations.', colors.yellow);
    log('   Run: Ctrl+C in the terminal running Expo\n', colors.cyan);
  }

  if (hasWarnings) {
    const continueAnyway = await askQuestion(
      `${colors.yellow}Do you want to continue anyway? (yes/no): ${colors.reset}`,
    );
    if (continueAnyway.toLowerCase() !== 'yes') {
      log('\n✋ Cleanup cancelled.', colors.cyan);
      process.exit(0);
    }
    console.log(''); // Empty line
  }

  // Find all migration files
  const files = findMigrationFiles();
  const totalFiles =
    files.sqliteMigrations.length +
    files.sqliteMeta.length +
    files.postgresMigrations.length +
    files.postgresMeta.length;

  if (totalFiles === 0) {
    log('✅ No migration files found. Nothing to clean up!', colors.green);
    process.exit(0);
  }

  // Display what will be deleted
  log('📋 The following files will be DELETED:\n', colors.bold);

  if (files.sqliteMigrations.length > 0) {
    log(`SQLite Migrations (${files.sqliteMigrations.length} files):`, colors.cyan);
    files.sqliteMigrations.forEach((file) => {
      log(`  • ${file.replace(rootDir, '.')}`, colors.yellow);
    });
    console.log('');
  }

  if (files.sqliteMeta.length > 0) {
    log(`SQLite Meta Files (${files.sqliteMeta.length} files):`, colors.cyan);
    files.sqliteMeta.forEach((file) => {
      log(`  • ${file.replace(rootDir, '.')}`, colors.yellow);
    });
    console.log('');
  }

  if (files.postgresMigrations.length > 0) {
    log(`Postgres Migrations (${files.postgresMigrations.length} files):`, colors.cyan);
    files.postgresMigrations.forEach((file) => {
      log(`  • ${file.replace(rootDir, '.')}`, colors.yellow);
    });
    console.log('');
  }

  if (files.postgresMeta.length > 0) {
    log(`Postgres Meta Files (${files.postgresMeta.length} files):`, colors.cyan);
    files.postgresMeta.forEach((file) => {
      log(`  • ${file.replace(rootDir, '.')}`, colors.yellow);
    });
    console.log('');
  }

  log(`📊 Total: ${totalFiles} files will be deleted\n`, colors.bold);

  // Preserved files
  log('✅ The following will be PRESERVED:', colors.green);
  log('  • supabase/migrations/README.md', colors.green);
  log('  • supabase/migrations/*.example files\n', colors.green);

  // Final confirmation
  const confirmation = await askQuestion(
    `${colors.red}${colors.bold}Are you absolutely sure you want to delete these files? (type "DELETE" to confirm): ${colors.reset}`,
  );

  if (confirmation !== 'DELETE') {
    log('\n✋ Cleanup cancelled. No files were deleted.', colors.cyan);
    process.exit(0);
  }

  // Perform deletion
  log('\n🗑️  Deleting files...', colors.yellow);

  let deletedCount = 0;

  [...files.sqliteMigrations, ...files.postgresMigrations].forEach((file) => {
    try {
      rmSync(file);
      deletedCount++;
    } catch (error) {
      log(`   ❌ Failed to delete: ${file}`, colors.red);
      log(`      Error: ${error.message}`, colors.red);
    }
  });

  [...files.sqliteMeta, ...files.postgresMeta].forEach((file) => {
    try {
      rmSync(file);
      deletedCount++;
    } catch (error) {
      log(`   ❌ Failed to delete: ${file}`, colors.red);
      log(`      Error: ${error.message}`, colors.red);
    }
  });

  log(`\n✅ Successfully deleted ${deletedCount} of ${totalFiles} files`, colors.green);

  // Next steps
  log('\n📝 NEXT STEPS:', colors.bold);
  log('  1. Generate fresh migrations:', colors.cyan);
  log('     npm run db:migrate', colors.green);
  log('  2. If Supabase is running, restart it to apply the new migrations:', colors.cyan);
  log('     Ctrl+C (to stop) then npm run supabase:dev', colors.green);
  log('  3. SQLite will be recreated automatically when the app launches\n', colors.cyan);

  log('✨ Cleanup complete!\n', colors.green + colors.bold);
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  process.exit(1);
});
