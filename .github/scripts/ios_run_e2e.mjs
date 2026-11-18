#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

function statusOf(result) {
  if (result.status !== null && result.status !== undefined)
    return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

function run(command, args, root, env, runCommand) {
  return runCommand(command, args, {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

function runWithTimeout(root, command, args, seconds, env, runCommand) {
  const helper = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'with_timeout.mjs',
  );
  return run(
    process.execPath,
    [helper, String(seconds), command, ...args],
    root,
    env,
    runCommand,
  );
}

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function sleep(seconds, root, env, runCommand) {
  return run('sleep', [String(seconds)], root, env, runCommand);
}

export function runE2E(options = {}) {
  const root = options.root ?? process.cwd();
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const runCommand = options.runCommand ?? spawnSync;
  const wait =
    options.sleep ?? ((seconds) => sleep(seconds, root, env, runCommand));
  const udidPath = path.join(root, '.simulator_udid');
  if (!existsSync(udidPath)) return 1;
  const udid = readFileSync(udidPath, 'utf8').replace(/\s/g, '');
  if (!udid) return 1;

  const attempts = Number(env.RETRIES || '2');
  const delay = Number(env.RETRY_DELAY || '2');
  if (
    !Number.isInteger(attempts) ||
    attempts < 1 ||
    !Number.isFinite(delay) ||
    delay < 0
  ) {
    io.stderr.write(
      'RETRIES must be a positive integer and RETRY_DELAY must be non-negative\n',
    );
    return 1;
  }
  const artifacts = path.join(root, 'e2e-artifacts');
  mkdirSync(artifacts, { recursive: true });

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const OUT = `e2e-artifacts/attempt-${attempt}`;
    const outputDirectory = path.join(root, OUT);
    mkdirSync(outputDirectory, { recursive: true });
    io.stdout.write(`🧪 E2E attempt ${attempt}/${attempts}...\n`);

    const result = runWithTimeout(
      root,
      'maestro',
      [
        '--device',
        udid,
        'test',
        '.maestro/flows/smoke.ios.yaml',
        '--test-output-dir',
        OUT,
      ],
      240,
      env,
      runCommand,
    );
    const log = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `${result.error.message}\n` : ''}`;
    writeFileSync(path.join(outputDirectory, 'maestro.log'), log);
    io.stdout.write(
      readFileSync(path.join(outputDirectory, 'maestro.log'), 'utf8'),
    );
    const code = statusOf(result);

    if (code === 0) {
      io.stdout.write(`✅ E2E passed on attempt ${attempt}\n`);
      writeFileSync(path.join(artifacts, 'EXITCODE'), '0\n');
      rmSync(path.join(artifacts, 'latest'), { force: true });
      symlinkSync(`attempt-${attempt}`, path.join(artifacts, 'latest'));
      return 0;
    }

    io.stdout.write(`❌ E2E attempt ${attempt} failed (exit code: ${code})\n`);
    if (attempt < attempts) {
      io.stdout.write(`⏳ Retrying in ${env.RETRY_DELAY || '2'}s...\n`);
      const slept = wait(delay);
      if (slept && statusOf(slept) !== 0) return statusOf(slept);
    }
  }

  writeFileSync(path.join(artifacts, 'EXITCODE'), `${attempts}\n`);
  return 1;
}

export function main(options = {}) {
  try {
    return runE2E(options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (
  process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith('/.github/scripts/ios_run_e2e.mjs')
) {
  process.exitCode = main();
}
