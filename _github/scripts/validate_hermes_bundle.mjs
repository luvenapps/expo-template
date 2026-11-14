import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export function loadExpoConfig(run = spawnSync) {
  const result = run('npx', ['expo', 'config', '--json'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(result.stderr.trim() || `Expo config exited with ${result.status}`);
  return JSON.parse(result.stdout);
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(entryPath) : [entryPath];
  });
}

export function validateHermesBundle(platform, options = {}) {
  const { root = process.cwd(), output = process.stdout } = options;
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error(`Unknown platform: ${platform} (expected ios or android)`);
  }

  const config = options.config ?? (options.loadConfig ?? loadExpoConfig)();
  const expectedEngine = String(
    config[platform]?.jsEngine ?? config.jsEngine ?? 'hermes',
  ).toLowerCase();
  if (!expectedEngine)
    throw new Error(`Could not determine expected ${platform} JS engine from Expo config`);

  const dist = join(root, 'dist');
  let distEntries;
  try {
    distEntries = readdirSync(dist);
  } catch {
    throw new Error('dist folder is missing');
  }
  if (distEntries.length === 0) throw new Error('dist folder is empty');

  let bundlePath;
  let expectedBundleSource;
  if (platform === 'ios') {
    bundlePath = filesUnder(dist).find((file) => {
      const normalized = relative(dist, file).split(sep).join('/');
      return /^_expo\/static\/js\/ios\/.*\.(js|hbc)$/.test(normalized);
    });
    if (!bundlePath)
      throw new Error('iOS bundle file not found under dist/_expo/static/js/ios (.js or .hbc)');
    expectedBundleSource = 'expo-export';
  } else {
    bundlePath = join(dist, 'index.android.bundle');
    if (!statExists(bundlePath))
      throw new Error(`Bundle file missing: ${relative(root, bundlePath)}`);
    if (!statExists(join(dist, 'assets'))?.isDirectory())
      throw new Error('Required assets directory missing: dist/assets');
    expectedBundleSource = 'export:embed';
  }

  const bundle = readFileSync(bundlePath);
  if (bundle.length === 0) throw new Error(`Bundle file is empty: ${relative(root, bundlePath)}`);

  const hasHermesMarker = bundle.includes(Buffer.from('Hermes'));
  let bundleSource = '';
  try {
    bundleSource = readFileSync(join(dist, '.bundle-source'), 'utf8').trim();
  } catch {
    // A missing marker is allowed when the bundle itself identifies Hermes.
  }

  if (expectedEngine === 'hermes' && !hasHermesMarker && bundleSource !== expectedBundleSource) {
    throw new Error(
      `Hermes expected but bundle has no Hermes marker and source is not ${expectedBundleSource}`,
    );
  }

  const result = {
    platform,
    expectedEngine,
    bundlePath: relative(root, bundlePath),
    bundleSize: bundle.length,
    hasHermesMarker,
    bundleSource: bundleSource || 'unknown',
  };
  output.write(`[validation] platform: ${result.platform}\n`);
  output.write(`[validation] expected engine: ${result.expectedEngine}\n`);
  output.write(`[validation] bundle path: ${result.bundlePath}\n`);
  output.write(`[validation] bundle file size (bytes): ${result.bundleSize}\n`);
  output.write(`[validation] hermes marker present: ${hasHermesMarker ? 'yes' : 'no'}\n`);
  output.write(`[validation] bundle source: ${result.bundleSource}\n`);
  return result;
}

function statExists(path) {
  try {
    return statSync(path);
  } catch {
    return undefined;
  }
}

export function main(argv = process.argv.slice(2), options = {}) {
  try {
    validateHermesBundle(argv[0], options);
    return 0;
  } catch (error) {
    (options.errorOutput ?? process.stderr).write(`❌ ${error.message}\n`);
    return 1;
  }
}

if (
  process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/validate_hermes_bundle.mjs')
) {
  process.exitCode = main();
}
