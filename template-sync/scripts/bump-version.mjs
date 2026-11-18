#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';

const args = process.argv.slice(2);
let releaseType = 'patch';
let explicitVersion;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--type') {
    releaseType = args[i + 1] ?? releaseType;
    i += 1;
  } else if (arg === '--set') {
    explicitVersion = args[i + 1];
    i += 1;
  }
}

const pkgPath = path.resolve('package.json');
const appConfigPath = path.resolve('app.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const appConfig = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));

const currentVersion = pkg.version;
let nextVersion = explicitVersion
  ? semver.valid(explicitVersion)
  : semver.inc(currentVersion, releaseType);

if (!nextVersion) {
  console.error(
    `[version-bump] Unable to compute next version. Current: ${currentVersion}, releaseType: ${releaseType}, explicit: ${explicitVersion ?? 'n/a'}`,
  );
  process.exit(1);
}

pkg.version = nextVersion;
appConfig.expo.version = nextVersion;

const nextBuildNumber = `${Number(appConfig.expo.ios.buildNumber ?? 0) + 1}`;
const nextVersionCode = Number(appConfig.expo.android.versionCode ?? 0) + 1;

appConfig.expo.ios.buildNumber = nextBuildNumber;
appConfig.expo.android.versionCode = nextVersionCode;

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
fs.writeFileSync(appConfigPath, `${JSON.stringify(appConfig, null, 2)}\n`);

console.log('[version-bump] Updated files:');
console.log(`  package.json -> ${currentVersion} → ${nextVersion}`);
console.log(`  app.json ios.buildNumber -> ${nextBuildNumber}`);
console.log(`  app.json android.versionCode -> ${nextVersionCode}`);
