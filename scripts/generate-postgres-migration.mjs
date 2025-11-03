#!/usr/bin/env node
/**
 * Generate Postgres/Supabase migrations from Drizzle schema
 * This script:
 * 1. Generates Drizzle schema migration
 * 2. Generates RLS policies
 * 3. Provides instructions for applying migrations
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command} ${args.join(' ')}\n`);
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      cwd: rootDir,
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
  console.log('📦 Generating Postgres/Supabase migrations from DOMAIN config...\n');

  // Step 1: Generate Drizzle migration
  console.log('Step 1: Generating Drizzle schema migration...');
  try {
    await run('npx', ['drizzle-kit', 'generate', '--config=drizzle.config.postgres.ts']);
    console.log('✅ Drizzle migration generated\n');
  } catch (error) {
    console.error('❌ Failed to generate Drizzle migration:', error.message);
    process.exit(1);
  }

  // Step 2: Generate RLS policies
  console.log('Step 2: Generating RLS policies...');
  try {
    await run('node', ['scripts/generate-rls-policies.mjs']);
    console.log('✅ RLS policies generated\n');
  } catch (error) {
    console.error('❌ Failed to generate RLS policies:', error.message);
    process.exit(1);
  }

  // Step 3: Post-process migration to add RLS policies and partial index WHERE clause
  const migrationsDir = path.join(rootDir, 'supabase/migrations');
  const rlsPoliciesPath = path.join(rootDir, 'src/db/postgres/rls-policies.sql');

  if (fs.existsSync(migrationsDir) && fs.existsSync(rlsPoliciesPath)) {
    const migrations = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .reverse();

    if (migrations.length > 0) {
      const latestMigration = migrations[0];
      const latestMigrationPath = path.join(migrationsDir, latestMigration);
      let migrationContent = fs.readFileSync(latestMigrationPath, 'utf8');
      const rlsPoliciesContent = fs.readFileSync(rlsPoliciesPath, 'utf8');

      // Add WHERE clause to partial unique index (Drizzle doesn't support this)
      console.log('\n📝 Post-processing migration...');
      if (migrationContent.includes('habit_entries_habit_id_date_unique')) {
        migrationContent = migrationContent.replace(
          /CREATE UNIQUE INDEX "habit_entries_habit_id_date_unique" ON "habit_entries" USING btree \("habit_id","date"\);/,
          'CREATE UNIQUE INDEX "habit_entries_habit_id_date_unique" ON "habit_entries" USING btree ("habit_id","date") WHERE deleted_at IS NULL;',
        );
        console.log('✅ Added WHERE clause to partial unique index');
      }

      // Check if RLS policies are already in the migration
      if (!migrationContent.includes('enable row level security')) {
        console.log(`📝 Appending RLS policies to: ${latestMigration}`);
        migrationContent += '\n\n' + rlsPoliciesContent;
        console.log('✅ RLS policies appended to migration');
      } else {
        console.log('✅ RLS policies already present in migration');
      }

      // Write updated migration
      fs.writeFileSync(latestMigrationPath, migrationContent, 'utf8');
      console.log('');
    }
  }

  console.log('━'.repeat(70));
  console.log('✅ Migration generation complete!\n');
  console.log('Next steps:');
  console.log('  1. Review the generated migration in supabase/migrations/');
  console.log('  2. Test locally: npm run supabase:dev');
  console.log('  3. Apply to production: npm run supabase:deploy');
  console.log('━'.repeat(70));
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
