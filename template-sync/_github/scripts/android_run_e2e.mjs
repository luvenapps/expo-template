/* global __filename */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
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

function saveExitCode(directory, code) {
  writeFileSync(join(directory, 'EXITCODE'), `${code}\n`);
}

export function runAndroidE2E(apkPath, packageName, options = {}) {
  const {
    root = process.cwd(),
    env = process.env,
    io = process,
    runCommand = (command, args, seconds) => runWithTimeout(root, command, args, seconds),
    sleep = pause,
  } = options;
  if (!apkPath) throw new Error('APK path required');
  if (!packageName) throw new Error('Package name required');
  const resolvedApk = isAbsolute(apkPath) ? apkPath : resolve(root, apkPath);
  if (!existsSync(resolvedApk)) throw new Error(`APK not found: ${resolvedApk}`);

  const attempts = positiveInteger(env.RETRIES, 2, 'RETRIES');
  const delay = nonnegativeInteger(env.RETRY_DELAY, 5, 'RETRY_DELAY');
  const artifactDirectory = join(root, 'e2e-artifacts');
  mkdirSync(artifactDirectory, { recursive: true });
  rmSync(join(artifactDirectory, 'latest'), { recursive: true, force: true });

  io.stdout.write(`📥 Installing ${resolvedApk}\n`);
  let initialInstall = runCommand('adb', ['install', '-r', resolvedApk], 120);
  printResult(initialInstall, io);

  if (
    initialInstall.status !== 0 &&
    /INSTALL_FAILED_UPDATE_INCOMPATIBLE/.test(
      `${initialInstall.stdout ?? ''}\n${initialInstall.stderr ?? ''}`,
    )
  ) {
    io.stderr.write(
      `⚠️ Existing ${packageName} install has a different signature; uninstalling before retry\n`,
    );
    const uninstall = runCommand('adb', ['uninstall', packageName], 30);
    printResult(uninstall, io);

    if (uninstall.status === 0) {
      initialInstall = runCommand('adb', ['install', '-r', resolvedApk], 120);
      printResult(initialInstall, io);
    }
  }

  if (initialInstall.status !== 0) {
    saveExitCode(artifactDirectory, initialInstall.status || 1);
    throw new Error(`Unable to install ${packageName} (exit code ${initialInstall.status})`);
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const outputDirectory = join(artifactDirectory, `attempt-${attempt}`);
    mkdirSync(outputDirectory, { recursive: true });
    io.stdout.write(`🧪 Android E2E attempt ${attempt}/${attempts}\n`);
    const result = runCommand(
      'maestro',
      ['test', '.maestro/flows/smoke.android.yaml', '--test-output-dir', outputDirectory],
      240,
    );
    printResult(result, io);
    if (result.status === 0) {
      saveExitCode(artifactDirectory, 0);
      rmSync(join(artifactDirectory, 'latest'), { recursive: true, force: true });
      symlinkSync(`attempt-${attempt}`, join(artifactDirectory, 'latest'));
      io.stdout.write(`✅ E2E passed on attempt ${attempt}\n`);
      return 0;
    }

    const exitCode = result.status || 1;
    if (attempt === attempts) {
      saveExitCode(artifactDirectory, exitCode);
      io.stderr.write(`❌ E2E failed after ${attempts} attempts (exit code ${exitCode})\n`);
      return exitCode;
    }

    io.stderr.write(`❌ Attempt ${attempt} failed; clearing app data before retry\n`);
    const clear = runCommand('adb', ['shell', 'pm', 'clear', packageName], 30);
    printResult(clear, io);
    if (clear.status !== 0) {
      io.stderr.write(`Unable to clear ${packageName}; reinstalling APK before retry\n`);
      const reinstall = runCommand('adb', ['install', '-r', resolvedApk], 120);
      printResult(reinstall, io);
      if (reinstall.status !== 0) {
        saveExitCode(artifactDirectory, reinstall.status || 1);
        throw new Error(`Unable to reinstall ${packageName} (exit code ${reinstall.status})`);
      }
    }
    sleep(delay);
  }
}

export function main(argv = process.argv.slice(2), options = {}) {
  try {
    return runAndroidE2E(argv[0], argv[1], options);
  } catch (error) {
    (options.io ?? process).stderr.write(`❌ ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/android_run_e2e.mjs')) {
  process.exitCode = main();
}
