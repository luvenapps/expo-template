#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
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

async function loadEnvFile() {
  try {
    await access(envFile);
  } catch {
    throw new Error(
      `[supabase-deploy] Missing ${envFile}. Populate it with your hosted Supabase credentials before deploying.`,
    );
  }

  const envContent = await readFile(envFile, 'utf8');

  // Parse and load environment variables
  envContent.split('\n').forEach((line) => {
    line = line.trim();
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('='); // Handle values with = in them
      process.env[key] = value;
    }
  });
}

async function getProjectRef() {
  const envContent = await readFile(envFile, 'utf8');
  const urlMatch = envContent.match(/EXPO_PUBLIC_SUPABASE_URL=https:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    throw new Error(
      '[supabase-deploy] Could not extract project ref from EXPO_PUBLIC_SUPABASE_URL',
    );
  }
  return urlMatch[1];
}

async function checkAuthentication() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    console.log('🔑 [supabase-deploy] Using SUPABASE_ACCESS_TOKEN from environment');
    return;
  }

  console.log('🔑 [supabase-deploy] Checking authentication status…');
  try {
    await run('npx', ['supabase', 'projects', 'list']);
  } catch {
    throw new Error(
      '[supabase-deploy] Not authenticated. Please run "npx supabase login" first, or set SUPABASE_ACCESS_TOKEN environment variable.',
    );
  }
}

async function main() {
  console.log('🚀 [supabase-deploy] Preparing deployment to Supabase cloud…');
  await loadEnvFile();
  await checkAuthentication();

  const projectRef = await getProjectRef();
  console.log(`🚀 [supabase-deploy] Deploying to project: ${projectRef}`);

  console.log('🚀 [supabase-deploy] Linking project…');
  await run('npx', ['supabase', 'link', '--project-ref', projectRef]);

  console.log('🚀 [supabase-deploy] Applying database migrations…');
  await run('npx', ['supabase', 'db', 'push', '--linked']);

  for (const fn of functions) {
    console.log(`🚀 [supabase-deploy] Deploying edge function "${fn}"…`);
    await run('npx', [
      'supabase',
      'functions',
      'deploy',
      fn,
      '--project-ref',
      projectRef,
      '--import-map',
      'supabase/functions/import_map.json',
    ]);
  }

  console.log('✅ [supabase-deploy] Deployment complete.');
}

main().catch((error) => {
  console.error('❌ [supabase-deploy] Failed to deploy Supabase changes:', error.message);
  process.exit(1);
});
