#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import process from 'node:process';

const RUNTIME_ENVIRONMENT = [
  ['EXPO_PUBLIC_TURN_ON_FIREBASE', 'TURN_ON_FIREBASE', false],
  ['RETRIES', 'RETRIES_VALUE', false],
  ['RETRY_DELAY', 'RETRY_DELAY_VALUE', false],
  ['EXPO_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY', true],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID', true],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', true],
  ['EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'FIREBASE_MEASUREMENT_ID', true],
  ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID', true],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', true],
  ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET', true],
  ['EXPO_PUBLIC_FIREBASE_VAPID_KEY', 'FIREBASE_VAPID_KEY', true],
  ['EXPO_PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_URL', false],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY', false],
  ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_ACCESS_TOKEN_VALUE', false],
];

export function mapRuntimeEnvironment(options = {}) {
  const env = options.env ?? process.env;
  const appendFile = options.appendFile ?? appendFileSync;
  const githubEnvironment = env.GITHUB_ENV;

  if (!githubEnvironment) {
    throw new Error('GITHUB_ENV is required');
  }

  for (const [key, source, optional] of RUNTIME_ENVIRONMENT) {
    if (!optional && env[source] === undefined) {
      throw new Error(`${source}: unbound variable`);
    }
    appendFile(githubEnvironment, `${key}=${env[source] ?? ''}\n`);
  }
}

export function main(options = {}) {
  try {
    mapRuntimeEnvironment(options);
    return 0;
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

/* istanbul ignore next -- exercised as a process.execPath CLI by the test context. */
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/map_runtime_env.mjs')) {
  process.exitCode = main();
}
