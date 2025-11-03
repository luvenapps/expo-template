#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import process from 'node:process';

const envFile = '.env.local';
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
      `[supabase-dev] Missing ${envFile}. Run "npx supabase status --env" after starting Supabase and copy the credentials into ${envFile} first.`,
    );
  }
}

let supabaseStarted = false;
let functionsProcess = null;
let shuttingDown = false;

async function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;

  if (functionsProcess && !functionsProcess.killed) {
    functionsProcess.kill('SIGINT');
  }

  if (supabaseStarted) {
    try {
      await run('npx', ['supabase', 'stop']);
    } catch (error) {
      console.warn('[supabase-dev] Failed to stop Supabase cleanly:', error.message);
    }
  }
}

async function main() {
  console.log('🟢 [supabase-dev] Starting local Supabase stack…');
  await ensureEnvFile();

  await run('npx', ['supabase', 'start']);
  supabaseStarted = true;

  console.log('🟢 [supabase-dev] Fetching environment details…');
  await run('npx', ['supabase', 'status', '--env']);

  console.log('🟢 [supabase-dev] Applying migrations to local stack…');
  await run('npx', ['supabase', 'db', 'push', '--env-file', envFile]);

  console.log('🟢 [supabase-dev] Serving edge functions with auto-reload…');
  functionsProcess = spawn('npx', ['supabase', 'functions', 'serve', '--env-file', envFile], {
    stdio: 'inherit',
    shell: isWindows,
  });

  functionsProcess.on('exit', (code) => {
    if (!shuttingDown) {
      console.warn(
        `[supabase-dev] Functions serve exited unexpectedly with code ${code ?? 'unknown'}.`,
      );
      cleanup().finally(() => process.exit(code ?? 1));
    }
  });

  console.log('✅ [supabase-dev] Local Supabase is ready.');
  console.log('   Keep this terminal open while developing. Press Ctrl+C to stop and clean up.');
}

process.on('SIGINT', () => {
  console.log('\n🛑 [supabase-dev] Caught interrupt. Cleaning up…');
  cleanup().finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('\n🛑 [supabase-dev] Received termination signal. Cleaning up…');
  cleanup().finally(() => process.exit(0));
});

process.on('exit', () => {
  if (!shuttingDown) {
    cleanup();
  }
});

main().catch((error) => {
  console.error('❌ [supabase-dev] Failed to start local Supabase:', error.message);
  cleanup().finally(() => process.exit(1));
});
