#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function runNpx(args, description) {
  const result = spawnSync('npx', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${description} failed${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  }
  return result.stdout;
}

function findIosBundle(dist) {
  const pending = [dist];
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        pending.push(filePath);
        continue;
      }
      const parts = filePath.split(path.sep);
      const iosBundlePath = parts.slice(-5, -1).join('/');
      if (iosBundlePath === '_expo/static/js/ios' && /\.(js|hbc)$/.test(entry.name)) {
        return filePath;
      }
    }
  }
  return '';
}

function validate(platform) {
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('Expected platform to be ios or android.');
  }

  let config;
  try {
    config = JSON.parse(runNpx(['expo', 'config', '--json'], 'Expo config'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Expo config did not return valid JSON.');
    throw error;
  }

  const expectedEngine = String(
    config[platform]?.jsEngine ?? config.jsEngine ?? 'hermes',
  ).toLowerCase();
  const dist = path.resolve('dist');
  if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
    throw new Error('dist folder is missing.');
  }

  let bundlePath;
  let expectedSource;
  if (platform === 'ios') {
    bundlePath = findIosBundle(dist);
    expectedSource = 'expo-export';
  } else {
    bundlePath = path.join(dist, 'index.android.bundle');
    expectedSource = 'export:embed';
    if (!fs.existsSync(path.join(dist, 'assets'))) {
      throw new Error('Required Android assets directory is missing: dist/assets');
    }
  }

  if (!bundlePath || !fs.existsSync(bundlePath)) {
    throw new Error(`${platform} JavaScript bundle was not found under dist.`);
  }

  const bundle = fs.readFileSync(bundlePath);
  if (bundle.length === 0) throw new Error(`JavaScript bundle is empty: ${bundlePath}`);

  const markerPath = path.join(dist, '.bundle-source');
  const bundleSource = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8').trim() : '';
  const hasHermesMarker = bundle.includes(Buffer.from('Hermes'));
  if (expectedEngine === 'hermes' && !hasHermesMarker && bundleSource !== expectedSource) {
    throw new Error(`Hermes is expected, but the bundle is not marked as ${expectedSource}.`);
  }

  console.log(`[validation] platform: ${platform}`);
  console.log(`[validation] expected engine: ${expectedEngine}`);
  console.log(`[validation] bundle path: ${bundlePath}`);
  console.log(`[validation] bundle file size (bytes): ${bundle.length}`);
  console.log(`[validation] Hermes marker present: ${hasHermesMarker ? 'yes' : 'no'}`);
  console.log(`[validation] bundle source: ${bundleSource || 'unknown'}`);
}

try {
  validate(process.argv[2]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
