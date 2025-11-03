#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import process from 'node:process';

const envFile = '.env.prod';
const functions = ['sync-push', 'sync-pull', 'export'];
const isWindows = process.platform === 'win32';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: isWindows,
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

async function ensureEnvFile() {
  try {
    await access(envFile);
  } catch {
    throw new Error(
      `[supabase-deploy] Missing ${envFile}. Populate it with your hosted Supabase credentials before deploying.`,
    );
  }
}

async function main() {
  console.log('🚀 [supabase-deploy] Preparing deployment to Supabase cloud…');
  await ensureEnvFile();

  console.log('🚀 [supabase-deploy] Applying database migrations…');
  await run('npx', ['supabase', 'db', 'push', '--env-file', envFile]);

  for (const fn of functions) {
    console.log(`🚀 [supabase-deploy] Deploying edge function "${fn}"…`);
    await run('npx', ['supabase', 'functions', 'deploy', fn, '--env-file', envFile]);
  }

  console.log('✅ [supabase-deploy] Deployment complete.');
}

main().catch((error) => {
  console.error('❌ [supabase-deploy] Failed to deploy Supabase changes:', error.message);
  process.exit(1);
});
