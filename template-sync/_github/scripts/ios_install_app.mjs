/* global __filename */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY =
  typeof __filename === 'string' ? dirname(__filename) : dirname(fileURLToPath(import.meta.url));

export function runWithTimeout(root, command, args, seconds) {
  const helper = join(SCRIPT_DIRECTORY, 'with_timeout.mjs');
  const result = spawnSync(process.execPath, [helper, String(seconds), command, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error,
  };
}

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function positiveInteger(value, fallback, label) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${label} must be a positive integer`);
  return parsed;
}

function nonnegativeInteger(value, fallback, label) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0)
    throw new Error(`${label} must be a non-negative integer`);
  return parsed;
}

function pause(seconds) {
  if (seconds > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

export function installApp(appPath, options = {}) {
  const {
    root = process.cwd(),
    env = process.env,
    io = process,
    runCommand = (command, args, seconds) => runWithTimeout(root, command, args, seconds),
    sleep = pause,
  } = options;
  if (!appPath) throw new Error('App path required');
  if (!existsSync(appPath)) throw new Error(`App not found: ${appPath}`);

  const udidPath = join(root, '.simulator_udid');
  if (!existsSync(udidPath))
    throw new Error('Simulator UDID file is missing; boot the selected simulator first');
  const udid = readFileSync(udidPath, 'utf8').trim();
  if (!udid) throw new Error('Simulator UDID file is empty');

  const infoPlist = join(appPath, 'Info.plist');
  const bundleResult = runCommand(
    '/usr/libexec/PlistBuddy',
    ['-c', 'Print :CFBundleIdentifier', infoPlist],
    10,
  );
  printResult(bundleResult, io);
  const bundleId = bundleResult.stdout?.trim() ?? '';
  if (bundleResult.status !== 0 || !bundleId)
    throw new Error(`Unable to read bundle identifier from ${infoPlist}`);

  const attempts = positiveInteger(env.RETRIES, 3, 'RETRIES');
  const delay = nonnegativeInteger(env.RETRY_DELAY, 5, 'RETRY_DELAY');
  let lastFailure = 'unknown error';
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    io.stdout.write(`Installing ${bundleId} on ${udid}, attempt ${attempt}/${attempts}\n`);
    const existing = runCommand(
      'xcrun',
      ['simctl', 'get_app_container', udid, bundleId, 'app'],
      15,
    );
    if (existing.status === 0) {
      const uninstall = runCommand('xcrun', ['simctl', 'uninstall', udid, bundleId], 60);
      printResult(uninstall, io);
      if (uninstall.status !== 0) {
        lastFailure = `uninstall exited with ${uninstall.status}`;
      } else {
        lastFailure = '';
      }
    } else {
      lastFailure = '';
    }

    if (!lastFailure) {
      const install = runCommand('xcrun', ['simctl', 'install', udid, appPath], 120);
      printResult(install, io);
      if (install.status === 0) {
        io.stdout.write(`Installed ${bundleId} on ${udid}\n`);
        return { udid, bundleId };
      }
      lastFailure = `install exited with ${install.status}`;
    }

    if (attempt < attempts) {
      io.stderr.write(`${lastFailure}; retrying in ${delay}s\n`);
      sleep(delay);
    }
  }

  throw new Error(`Could not install ${bundleId} after ${attempts} attempts: ${lastFailure}`);
}

export function main(argv = process.argv.slice(2), options = {}) {
  try {
    installApp(argv[0], options);
    return 0;
  } catch (error) {
    (options.io ?? process).stderr.write(`❌ ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/ios_install_app.mjs')) {
  process.exitCode = main();
}
