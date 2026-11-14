#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import process from 'node:process';

const ENVIRONMENT_MAPPING = [
  ['EXPO_PUBLIC_TURN_ON_FIREBASE', 'TURN_ON_FIREBASE'],
  ['RETRIES', 'RETRIES_VALUE'],
  ['RETRY_DELAY', 'RETRY_DELAY_VALUE'],
  ['EXPO_PUBLIC_FIREBASE_API_KEY', 'FIREBASE_API_KEY', true],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', 'FIREBASE_APP_ID', true],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', true],
  ['EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID', 'FIREBASE_MEASUREMENT_ID', true],
  ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID', true],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', true],
  ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET', true],
  ['EXPO_PUBLIC_FIREBASE_VAPID_KEY', 'FIREBASE_VAPID_KEY', true],
  ['EXPO_PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_URL'],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY'],
  ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_ACCESS_TOKEN_VALUE'],
];

export function mapRuntimeEnv(env = process.env, appendFile = appendFileSync) {
  for (const [outputName, inputName, optional] of ENVIRONMENT_MAPPING) {
    const value = env[inputName];
    if (value === undefined && !optional) throw new Error(`${inputName}: unbound variable`);
    if (env.GITHUB_ENV === undefined) throw new Error('GITHUB_ENV: unbound variable');
    appendFile(env.GITHUB_ENV, `${outputName}=${value ?? ''}\n`);
  }
}

export function main(env = process.env, appendFile = appendFileSync, io = process) {
  try {
    mapRuntimeEnv(env, appendFile);
    return 0;
  } catch (error) {
    io.stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/map_runtime_env.mjs')) {
  process.exitCode = main();
}
