#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CACHE_KEY_VERSION = 'v1';

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed${result.stderr ? `: ${result.stderr.trim()}` : ''}`);
  }

  return result.stdout.trim();
}

function addCcacheToBuildProperties(appConfigPath, source) {
  const pluginStart = source.indexOf("'expo-build-properties'");
  if (pluginStart < 0) fail('expo-build-properties plugin was not found in app.config.ts.');

  const iosMatch = /\bios\s*:\s*\{/.exec(source.slice(pluginStart));
  if (!iosMatch) fail('The iOS build-properties configuration was not found.');

  const iosStart = pluginStart + iosMatch.index;
  const openBrace = iosStart + iosMatch[0].length;
  const closeBrace = source.indexOf('}', openBrace);
  if (closeBrace < 0) fail('The iOS build-properties configuration is not closed.');

  const iosProperties = source.slice(openBrace, closeBrace);
  if (/\bccacheEnabled\s*:/.test(iosProperties)) {
    fail('app.config.ts already sets ios.ccacheEnabled; refusing to overwrite it.');
  }

  const updated = `${source.slice(0, openBrace)}\n            ccacheEnabled: true,${source.slice(openBrace)}`;
  fs.writeFileSync(appConfigPath, updated);
  return updated;
}

function injectJavaScriptMarker(projectRoot, marker) {
  const layoutPath = path.join(projectRoot, 'app', '_layout.tsx');
  if (!fs.existsSync(layoutPath)) fail(`The generated app layout is missing: ${layoutPath}`);

  let source = fs.readFileSync(layoutPath, 'utf8');
  const markerLine = `Object.assign(globalThis, { __IOS_CACHE_SPIKE_MARKER__: '${marker}' });`;
  const existingMarker =
    /^Object\.assign\(globalThis, \{ __IOS_CACHE_SPIKE_MARKER__: '[A-Za-z0-9._-]+' \}\);\r?\n/m;

  source = existingMarker.test(source)
    ? source.replace(existingMarker, `${markerLine}\n`)
    : `${markerLine}\n${source}`;
  fs.writeFileSync(layoutPath, source);
}

function injectNativeConfigMarker(appConfigPath, source, marker) {
  const infoPlistMatch = /\binfoPlist\s*:\s*\{/.exec(source);
  if (!infoPlistMatch) fail('The iOS infoPlist configuration was not found.');

  const openBrace = infoPlistMatch.index + infoPlistMatch[0].length;
  const closeBrace = source.indexOf('}', openBrace);
  if (closeBrace < 0) fail('The iOS infoPlist configuration is not closed.');

  const infoPlist = source.slice(openBrace, closeBrace);
  if (/\bIOSCacheSpikeMarker\s*:/.test(infoPlist)) {
    fail('app.config.ts already sets IOSCacheSpikeMarker; refusing to overwrite it.');
  }

  const updated = `${source.slice(0, openBrace)}\n          IOSCacheSpikeMarker: '${marker}',${source.slice(openBrace)}`;
  fs.writeFileSync(appConfigPath, updated);
}

function prepare(projectRoot, strategy, scenario, marker) {
  if (!['none', 'ccache', 'deriveddata'].includes(strategy)) {
    fail('Expected cache strategy none, ccache, or deriveddata.');
  }
  if (!['unchanged', 'javascript-only', 'native-config'].includes(scenario)) {
    fail('Expected scenario unchanged, javascript-only, or native-config.');
  }
  if (!/^[A-Za-z0-9._-]+$/.test(marker)) fail('The run marker contains unsupported characters.');

  const appConfigPath = path.join(projectRoot, 'app.config.ts');
  if (!fs.existsSync(appConfigPath)) fail(`The generated app config is missing: ${appConfigPath}`);

  let appConfig = fs.readFileSync(appConfigPath, 'utf8');
  if (strategy === 'ccache') {
    appConfig = addCcacheToBuildProperties(appConfigPath, appConfig);
  }

  if (scenario !== 'unchanged') {
    injectJavaScriptMarker(projectRoot, marker);
  }

  if (scenario === 'native-config') {
    injectNativeConfigMarker(appConfigPath, appConfig, marker);
  }

  if (strategy === 'deriveddata') {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const postInstallHook = packageJson.scripts?.['eas-build-post-install'];
    if (typeof postInstallHook !== 'string') {
      fail('The generated app is missing the eas-build-post-install hook.');
    }

    const hydrateCommand =
      'node "$GITHUB_WORKSPACE/.github/scripts/ios_build_cache_spike.mjs" hydrate-deriveddata';
    if (!postInstallHook.includes(hydrateCommand)) {
      packageJson.scripts['eas-build-post-install'] = `${postInstallHook} && ${hydrateCommand}`;
      fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    }
  }

  console.log(`[cache-spike] strategy=${strategy} scenario=${scenario}`);
  if (scenario !== 'unchanged') console.log(`[cache-spike] JavaScript marker=${marker}`);
  if (scenario === 'native-config')
    console.log('[cache-spike] Added a generated-app iOS Info.plist marker.');
}

function walkFiles(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }

  return files.sort();
}

function hashFile(hash, root, filePath) {
  const relativePath = path.relative(root, filePath);
  hash.update(relativePath);
  hash.update('\0');
  hash.update(fs.readFileSync(filePath));
  hash.update('\0');
}

function key(projectRoot, strategy) {
  if (!['ccache', 'deriveddata'].includes(strategy)) {
    fail('Expected cache strategy ccache or deriveddata when computing a cache key.');
  }

  const workspaceRoot = process.env.GITHUB_WORKSPACE || process.cwd();
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const lockPath = path.join(projectRoot, 'package-lock.json');
  const easPath = path.join(projectRoot, 'eas.json');
  const appConfigPath = path.join(projectRoot, 'app.config.ts');
  for (const requiredPath of [packageJsonPath, lockPath, easPath, appConfigPath]) {
    if (!fs.existsSync(requiredPath)) fail(`A cache-key input is missing: ${requiredPath}`);
  }

  const expoConfig = JSON.parse(run('npx', ['expo', 'config', '--json'], { cwd: projectRoot }));
  const easConfig = JSON.parse(fs.readFileSync(easPath, 'utf8'));
  const nativeConfig = {
    name: expoConfig.name,
    slug: expoConfig.slug,
    scheme: expoConfig.scheme,
    easProjectId: expoConfig.extra?.eas?.projectId,
    ios: expoConfig.ios,
    plugins: expoConfig.plugins,
    jsEngine: expoConfig.jsEngine,
    newArchEnabled: expoConfig.newArchEnabled,
    runtimeVersion: expoConfig.runtimeVersion,
    buildProfile: easConfig.build?.e2eRelease,
  };

  const xcodeVersion = run('xcodebuild', ['-version']);
  const simulatorSdk = run('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-version']);
  const runnerOs = process.env.RUNNER_OS || process.platform;
  const runnerArch = process.env.RUNNER_ARCH || process.arch;
  const ccacheVersion = strategy === 'ccache' ? run('ccache', ['--version']).split('\n')[0] : '';
  const inputHash = createHash('sha256');

  for (const requiredFile of [
    packageJsonPath,
    lockPath,
    easPath,
    appConfigPath,
    path.join(projectRoot, '.mise.toml'),
    path.join(workspaceRoot, '.mise.ci.toml'),
    path.join(workspaceRoot, '.github', 'scripts', 'ios_simulator_arch.mjs'),
    path.join(workspaceRoot, '.github', 'scripts', 'ios_build_cache_spike.mjs'),
  ]) {
    if (fs.existsSync(requiredFile)) hashFile(inputHash, projectRoot, requiredFile);
  }

  for (const pluginFile of walkFiles(path.join(projectRoot, 'plugins'))) {
    hashFile(inputHash, projectRoot, pluginFile);
  }

  inputHash.update(JSON.stringify(nativeConfig));
  inputHash.update('\0');
  inputHash.update(process.version);
  inputHash.update('\0');
  inputHash.update(process.env.EAS_CLI_VERSION || 'unknown-eas-cli');
  inputHash.update('\0');
  inputHash.update(process.env.FASTLANE_VERSION || 'unknown-fastlane');
  inputHash.update('\0');
  inputHash.update(process.env.EAS_LOCAL_BUILD_WORKINGDIR || 'default-eas-local-workingdir');
  inputHash.update('\0');
  inputHash.update(ccacheVersion);
  inputHash.update('\0');
  inputHash.update(
    process.env.GOOGLE_SERVICE_INFO_PLIST_B64
      ? createHash('sha256').update(process.env.GOOGLE_SERVICE_INFO_PLIST_B64).digest('hex')
      : 'no-google-service-info',
  );

  const digest = inputHash.digest('hex');
  const safeXcode = xcodeVersion
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/g, '');
  const safeSdk = simulatorSdk.replace(/[^a-zA-Z0-9._-]/g, '-');
  const keyValue = `ios-${strategy}-${CACHE_KEY_VERSION}-${runnerOs}-${runnerArch}-${safeXcode}-${safeSdk}-${digest}`;
  console.log(`key=${keyValue}`);
  console.error(
    `[cache-spike] key inputs: ${runnerOs}/${runnerArch}, ${xcodeVersion.replace(/\n/g, ', ')}, iOS Simulator SDK ${simulatorSdk}`,
  );
}

function verifyBundle(appPath, marker) {
  if (!/^[A-Za-z0-9._-]+$/.test(marker)) fail('The run marker contains unsupported characters.');
  if (!fs.existsSync(appPath) || !fs.statSync(appPath).isDirectory()) {
    fail(`The built iOS app is missing: ${appPath}`);
  }

  const expected = Buffer.from(marker);
  const bundles = walkFiles(appPath).filter((filePath) =>
    /(?:main\.jsbundle|\.hbc|\.bundle)$/.test(path.basename(filePath)),
  );

  for (const bundlePath of bundles) {
    if (fs.readFileSync(bundlePath).includes(expected)) {
      console.log(`[cache-spike] Verified current JavaScript marker in ${bundlePath}`);
      return;
    }
  }

  fail(
    `The current JavaScript marker was not found in the built app bundle (${bundles.length} bundle candidates).`,
  );
}

function hydrateDerivedData() {
  const cacheDirectory = process.env.IOS_DERIVEDDATA_CACHE_DIR;
  if (!cacheDirectory) fail('IOS_DERIVEDDATA_CACHE_DIR is required to hydrate DerivedData.');

  if (process.env.IOS_DERIVEDDATA_CACHE_HIT !== 'true') {
    console.log('[cache-spike] No restored DerivedData cache to hydrate.');
    return;
  }

  if (!fs.existsSync(cacheDirectory) || fs.readdirSync(cacheDirectory).length === 0) {
    console.log('[cache-spike] The restored DerivedData cache is empty.');
    return;
  }

  const projectRoot = process.env.EAS_BUILD_WORKINGDIR || process.cwd();
  const derivedDataPath = path.resolve(projectRoot, 'ios', 'build');
  fs.mkdirSync(derivedDataPath, { recursive: true });
  fs.cpSync(cacheDirectory, derivedDataPath, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
  console.log(`[cache-spike] Restored Xcode build data into ${derivedDataPath}`);
}

function stageDerivedData() {
  const workingDirectory = process.env.EAS_LOCAL_BUILD_WORKINGDIR;
  const cacheDirectory = process.env.IOS_DERIVEDDATA_CACHE_DIR;
  if (!workingDirectory || !cacheDirectory) {
    fail(
      'EAS_LOCAL_BUILD_WORKINGDIR and IOS_DERIVEDDATA_CACHE_DIR are required to stage DerivedData.',
    );
  }

  const derivedDataPath = path.join(workingDirectory, 'build', 'ios', 'build');
  if (!fs.existsSync(derivedDataPath) || fs.readdirSync(derivedDataPath).length === 0) {
    fail(`The EAS iOS build data is missing or empty: ${derivedDataPath}`);
  }

  fs.rmSync(cacheDirectory, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(cacheDirectory), { recursive: true });
  fs.cpSync(derivedDataPath, cacheDirectory, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
  console.log(`[cache-spike] Staged Xcode build data in ${cacheDirectory}`);
}

function main() {
  const [command, ...args] = process.argv.slice(2);

  if (command === 'prepare') {
    const [projectRoot, strategy, scenario, marker] = args;
    if (!projectRoot || !strategy || !scenario || !marker) {
      fail('Usage: ios_build_cache_spike.mjs prepare <project> <strategy> <scenario> <marker>');
    }
    prepare(path.resolve(projectRoot), strategy, scenario, marker);
    return;
  }

  if (command === 'key') {
    const [projectRoot, strategy] = args;
    if (!projectRoot || !strategy) {
      fail('Usage: ios_build_cache_spike.mjs key <project> <strategy>');
    }
    key(path.resolve(projectRoot), strategy);
    return;
  }

  if (command === 'verify-js') {
    const [appPath, marker] = args;
    if (!appPath || !marker) {
      fail('Usage: ios_build_cache_spike.mjs verify-js <app> <marker>');
    }
    verifyBundle(path.resolve(appPath), marker);
    return;
  }

  if (command === 'hydrate-deriveddata') {
    hydrateDerivedData();
    return;
  }

  if (command === 'stage-deriveddata') {
    stageDerivedData();
    return;
  }

  fail('Expected command: prepare, key, verify-js, hydrate-deriveddata, or stage-deriveddata.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
