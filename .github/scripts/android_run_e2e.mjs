#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

function statusOf(result) {
  if (result.status !== null && result.status !== undefined)
    return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

function run(command, args, options, runCommand) {
  return runCommand(command, args, options);
}

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function nonnegativeInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0)
    throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

function pause(seconds) {
  if (seconds > 0)
    Atomics.wait(
      new Int32Array(new SharedArrayBuffer(4)),
      0,
      0,
      seconds * 1000,
    );
}

export function runAndroidE2E(argv = process.argv.slice(2), options = {}) {
  const root = options.root ?? process.cwd();
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const runCommand =
    options.runCommand ??
    ((command, args, commandOptions) =>
      spawnSync(command, args, {
        ...commandOptions,
        cwd: root,
        env,
        encoding: 'utf8',
      }));
  const sleep = options.sleep ?? pause;
  const APK = argv[0];
  const PKG = argv[1];

  if (!APK) throw new Error('apk path required');
  if (!PKG) throw new Error('package name required');
  if (!existsSync(resolve(root, APK))) {
    io.stderr.write(`❌ APK not found: ${APK}\n`);
    return 1;
  }

  const ATTEMPTS = positiveInteger(env.RETRIES || '2', '2', 'RETRIES');
  const DELAY = nonnegativeInteger(env.RETRY_DELAY || '5', '5', 'RETRY_DELAY');
  let INSTALLED = false;
  let attempt = 1;
  const artifactDirectory = join(root, 'e2e-artifacts');

  while (attempt <= ATTEMPTS) {
    io.stdout.write(`🔄 Android E2E attempt ${attempt}/${ATTEMPTS}...\n`);

    if (!INSTALLED) {
      io.stdout.write(`📦 Uninstall (if present): ${PKG}\n`);
      printResult(
        run('adb', ['uninstall', PKG], { stdio: 'inherit' }, runCommand),
        io,
      );

      io.stdout.write(`📥 Install: ${APK}\n`);
      const install = run(
        'adb',
        ['install', '-r', APK],
        { stdio: 'inherit' },
        runCommand,
      );
      printResult(install, io);
      if (statusOf(install) !== 0) {
        io.stdout.write(`⚠️  Install failed on attempt ${attempt}\n`);
        if (attempt < ATTEMPTS) {
          io.stdout.write(
            `🧹 Cooling down ${env.RETRY_DELAY || '5'}s before retry...\n`,
          );
          sleep(DELAY);
          attempt += 1;
          continue;
        }
        io.stdout.write(`❌ Install failed after ${ATTEMPTS} attempts\n`);
        return 1;
      }
      INSTALLED = true;
    }

    printResult(
      run(
        'adb',
        ['shell', 'input', 'keyevent', '224'],
        { stdio: 'inherit' },
        runCommand,
      ),
      io,
    );
    printResult(
      run(
        'adb',
        ['shell', 'input', 'keyevent', '82'],
        { stdio: 'inherit' },
        runCommand,
      ),
      io,
    );

    mkdirSync(artifactDirectory, { recursive: true });
    const OUT = `e2e-artifacts/attempt-${attempt}`;
    const outputDirectory = join(root, OUT);
    mkdirSync(outputDirectory, { recursive: true });
    const e2e = run(
      'npm',
      ['run', 'e2e:android', '--', '--test-output-dir', OUT],
      { stdio: 'inherit' },
      runCommand,
    );
    printResult(e2e, io);
    if (statusOf(e2e) === 0) {
      io.stdout.write(`✅ Passed on attempt ${attempt}\n`);
      writeFileSync(join(artifactDirectory, 'EXITCODE'), '0\n');
      rmSync(join(artifactDirectory, 'latest'), { force: true });
      symlinkSync(`attempt-${attempt}`, join(artifactDirectory, 'latest'));
      return 0;
    }

    io.stdout.write(`❌ Attempt ${attempt} failed\n`);
    if (attempt < ATTEMPTS) {
      io.stdout.write(
        `🧹 Cooling down ${env.RETRY_DELAY || '5'}s & stopping app before retry...\n`,
      );
      printResult(
        run(
          'adb',
          ['shell', 'am', 'force-stop', PKG],
          { stdio: 'inherit' },
          runCommand,
        ),
        io,
      );
      const clear = run(
        'adb',
        ['shell', 'pm', 'clear', PKG],
        { stdio: 'inherit' },
        runCommand,
      );
      printResult(clear, io);
      if (statusOf(clear) !== 0) INSTALLED = false;
      sleep(DELAY);
    }

    attempt += 1;
  }

  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(join(artifactDirectory, 'EXITCODE'), `${ATTEMPTS}\n`);
  io.stdout.write(`❌ E2E failed after ${ATTEMPTS} attempts\n`);
  return 1;
}

export function main(argv = process.argv.slice(2), options = {}) {
  try {
    return runAndroidE2E(argv, options);
  } catch (error) {
    (options.io ?? process).stderr.write(`❌ ${error.message}\n`);
    return 1;
  }
}

if (
  process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith('/.github/scripts/android_run_e2e.mjs')
) {
  process.exitCode = main();
}
