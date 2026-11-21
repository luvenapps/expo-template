/* global __filename */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

export function runE2E(options = {}) {
  const {
    root = process.cwd(),
    env = process.env,
    io = process,
    runCommand = (command, args, seconds) => runWithTimeout(root, command, args, seconds),
    sleep = pause,
  } = options;
  const udidPath = join(root, '.simulator_udid');
  if (!existsSync(udidPath))
    throw new Error('Simulator UDID file is missing; boot the selected simulator first');
  const udid = readFileSync(udidPath, 'utf8').trim();
  if (!udid) throw new Error('Simulator UDID file is empty');

  const attempts = positiveInteger(env.RETRIES, 2, 'RETRIES');
  const delay = nonnegativeInteger(env.RETRY_DELAY, 2, 'RETRY_DELAY');
  const artifactDirectory = join(root, 'e2e-artifacts');
  mkdirSync(artifactDirectory, { recursive: true });
  rmSync(join(artifactDirectory, 'latest'), { recursive: true, force: true });

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const outputDirectory = join(artifactDirectory, `attempt-${attempt}`);
    mkdirSync(outputDirectory, { recursive: true });
    io.stdout.write(`🧪 iOS E2E attempt ${attempt}/${attempts} on ${udid}\n`);
    const result = runCommand(
      'maestro',
      [
        '--device',
        udid,
        'test',
        '.maestro/flows/smoke.ios.yaml',
        '--test-output-dir',
        outputDirectory,
      ],
      240,
    );
    printResult(result, io);
    if (result.status === 0) {
      writeFileSync(join(artifactDirectory, 'EXITCODE'), '0\n');
      rmSync(join(artifactDirectory, 'latest'), { recursive: true, force: true });
      symlinkSync(`attempt-${attempt}`, join(artifactDirectory, 'latest'));
      io.stdout.write(`✅ E2E passed on attempt ${attempt}\n`);
      return 0;
    }

    const exitCode = result.status || 1;
    if (attempt === attempts) {
      writeFileSync(join(artifactDirectory, 'EXITCODE'), `${exitCode}\n`);
      io.stderr.write(`❌ E2E failed after ${attempts} attempts (exit code ${exitCode})\n`);
      return exitCode;
    }
    io.stderr.write(`❌ E2E attempt ${attempt} failed; retrying in ${delay}s\n`);
    sleep(delay);
  }
}

export function main(options = {}) {
  try {
    return runE2E(options);
  } catch (error) {
    (options.io ?? process).stderr.write(`❌ ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/ios_run_e2e.mjs')) {
  process.exitCode = main();
}
