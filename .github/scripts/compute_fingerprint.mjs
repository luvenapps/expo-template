#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

function fingerprintNativeProject(platform) {
  const result = spawnSync(
    'npx',
    ['@expo/fingerprint', 'fingerprint:generate', '--platform', platform],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Expo fingerprint failed${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  }

  let fingerprint;
  try {
    fingerprint = JSON.parse(result.stdout).hash;
  } catch {
    throw new Error('Expo fingerprint did not return valid JSON.');
  }
  if (typeof fingerprint !== 'string' || fingerprint.length === 0) {
    throw new Error('Expo fingerprint did not return a hash.');
  }
  return fingerprint;
}

function cacheKey(platform, fingerprint, environment) {
  const repository = environment.GITHUB_REPOSITORY || 'local-repo';
  const safeRepository = repository.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const firebaseEnabled = environment.EXPO_PUBLIC_TURN_ON_FIREBASE || 'false';
  let credentialsHash = '';

  if (firebaseEnabled === 'true') {
    const credentialName =
      platform === 'ios' ? 'GOOGLE_SERVICE_INFO_PLIST_B64' : 'GOOGLE_SERVICES_JSON_B64';
    const credentials = environment[credentialName];
    if (!credentials) {
      throw new Error(`${credentialName} is required when Firebase is enabled.`);
    }
    credentialsHash = createHash('sha256').update(credentials).digest('hex').slice(0, 8);
  }

  const artifact = platform === 'ios' ? 'app' : 'apk';
  return `${platform}-${safeRepository}-${artifact}-${fingerprint}-${firebaseEnabled}-${credentialsHash}`;
}

function main() {
  const platform = process.argv[2];
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('Expected platform to be ios or android.');
  }

  const fingerprint = fingerprintNativeProject(platform);
  const key = cacheKey(platform, fingerprint, process.env);
  console.log(`key=${key}`);
  console.error(`🔑 ${platform.toUpperCase()}_FINGERPRINT=${fingerprint}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
