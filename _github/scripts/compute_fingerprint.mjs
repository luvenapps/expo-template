import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const supportedPlatforms = new Set(['ios', 'android']);

export function generateFingerprint(platform, run = spawnSync) {
  const result = run('npx', ['@expo/fingerprint', 'fingerprint:generate', '--platform', platform], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Fingerprint command exited with ${result.status}`);
  }

  return result.stdout;
}

export function sanitizeRepositorySlug(slug) {
  return slug.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function computeFingerprint(
  platform,
  environment = process.env,
  runFingerprint = generateFingerprint,
) {
  if (!platform) throw new Error('Platform argument required (ios or android)');
  if (!supportedPlatforms.has(platform)) throw new Error("Platform must be 'ios' or 'android'");

  const fingerprintOutput = runFingerprint(platform);
  const fingerprint =
    typeof fingerprintOutput === 'string' ? JSON.parse(fingerprintOutput) : fingerprintOutput;
  if (typeof fingerprint?.hash !== 'string' || fingerprint.hash.length === 0) {
    throw new Error('Fingerprint output did not contain a hash');
  }

  const firebaseFlag = environment.EXPO_PUBLIC_TURN_ON_FIREBASE ?? 'false';
  const repository = sanitizeRepositorySlug(environment.GITHUB_REPOSITORY ?? 'local-repo');
  let credentialsHash = '';

  if (firebaseFlag === 'true') {
    const credentialName =
      platform === 'ios' ? 'GOOGLE_SERVICE_INFO_PLIST_B64' : 'GOOGLE_SERVICES_JSON_B64';
    credentialsHash = createHash('sha256')
      .update(environment[credentialName] ?? '')
      .digest('hex')
      .slice(0, 8);
  }

  const artifact = platform === 'ios' ? 'app' : 'apk';
  const key = `${platform}-${repository}-${artifact}-${fingerprint.hash}-${firebaseFlag}-${credentialsHash}`;

  return { key, fingerprintHash: fingerprint.hash, repository, firebaseFlag, credentialsHash };
}

export function main(
  argv = process.argv.slice(2),
  environment = process.env,
  io = process,
  runFingerprint = generateFingerprint,
) {
  try {
    const result = computeFingerprint(argv[0], environment, runFingerprint);
    io.stdout.write(`key=${result.key}\n`);
    io.stderr.write(
      `🔑 ${argv[0].toUpperCase()}_FINGERPRINT=${result.fingerprintHash} (repo=${result.repository}, firebase=${result.firebaseFlag}, creds=${result.credentialsHash})\n`,
    );
    return 0;
  } catch (error) {
    io.stderr.write(`Error: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/compute_fingerprint.mjs')) {
  process.exitCode = main();
}
