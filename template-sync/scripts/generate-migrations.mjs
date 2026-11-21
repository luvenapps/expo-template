#!/usr/bin/env node
/**
 * Generate migrations for both SQLite and Postgres
 * This is the primary command developers should use when making schema changes
 */
import { spawn } from 'node:child_process';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}\n`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });

    child.on('error', (error) => reject(error));
  });
}

async function main() {
  console.log('📦 Generating migrations for both SQLite and Postgres...\n');
  console.log('━'.repeat(70));

  // Step 1: Generate SQLite migration
  console.log('\n📱 Step 1/2: Generating SQLite migration...');
  try {
    await run('pnpm', ['exec', 'drizzle-kit', 'generate', '--config=drizzle.config.sqlite.ts']);
    console.log('✅ SQLite migration generated');
  } catch (error) {
    console.error('❌ Failed to generate SQLite migration:', error.message);
    process.exit(1);
  }

  // Step 2: Generate Postgres migration
  console.log('\n☁️  Step 2/2: Generating Postgres migration (with RLS policies)...');
  try {
    await run('node', ['scripts/generate-postgres-migration.mjs']);
    console.log('✅ Postgres migration generated');
  } catch (error) {
    console.error('❌ Failed to generate Postgres migration:', error.message);
    process.exit(1);
  }

  console.log('\n' + '━'.repeat(70));
  console.log('✅ All migrations generated successfully!\n');
  console.log('📝 Review your changes:');
  console.log('   - SQLite: src/db/sqlite/migrations/');
  console.log('   - Postgres: supabase/migrations/\n');
  console.log('🚀 Next steps:');
  console.log('   1. Review the generated SQL files');
  console.log('   2. Test locally: pnpm start');
  console.log('   3. Deploy to Supabase: pnpm run supabase:deploy');
  console.log('━'.repeat(70));
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
