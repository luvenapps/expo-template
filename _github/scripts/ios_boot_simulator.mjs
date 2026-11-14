import { spawnSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function runWithTimeout(root, command, args, seconds) {
  const helper = join(root, '.github/scripts/with_timeout.mjs');
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

export function bootSimulator(options = {}) {
  const {
    root = process.cwd(),
    env = process.env,
    io = process,
    runCommand = (command, args, seconds) => runWithTimeout(root, command, args, seconds),
    sleep = pause,
  } = options;
  const udidFile = join(root, '.simulator_udid');
  if (existsSync(udidFile)) unlinkSync(udidFile);

  const deviceName = env.IOS_DEVICE;
  if (!deviceName) throw new Error('IOS_DEVICE is required');
  const attempts = positiveInteger(env.RETRIES, 2, 'RETRIES');
  const delay = nonnegativeInteger(env.RETRY_DELAY, 5, 'RETRY_DELAY');
  const list = runCommand('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], 30);
  printResult({ ...list, stdout: '' }, io);
  if (list.status !== 0) throw new Error('Unable to list available iOS simulators');

  let devices;
  try {
    devices = Object.values(JSON.parse(list.stdout).devices ?? {}).flat();
  } catch {
    throw new Error('xcrun returned invalid simulator device JSON');
  }
  const device = devices.find(
    (candidate) => candidate.name === deviceName && candidate.isAvailable !== false,
  );
  if (!device) {
    const available = devices
      .filter((candidate) => candidate.isAvailable !== false)
      .map((candidate) => candidate.name);
    throw new Error(
      `No available simulator named ${deviceName}. Available iPhones: ${available.join(', ') || 'none'}`,
    );
  }

  io.stdout.write(`Selected simulator: ${device.name} (${device.udid})\n`);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    runCommand('xcrun', ['simctl', 'shutdown', device.udid], 30);
    const boot = runCommand('xcrun', ['simctl', 'boot', device.udid], 30);
    printResult(boot, io);
    if (boot.status === 0) {
      const ready = runCommand('xcrun', ['simctl', 'bootstatus', device.udid, '-b'], 180);
      printResult(ready, io);
      if (ready.status === 0) {
        writeFileSync(udidFile, `${device.udid}\n`);
        io.stdout.write(`Simulator booted on attempt ${attempt}/${attempts}\n`);
        return device.udid;
      }
    }

    if (attempt < attempts) {
      io.stderr.write(
        `Simulator boot attempt ${attempt}/${attempts} failed; retrying in ${delay}s\n`,
      );
      runCommand('xcrun', ['simctl', 'shutdown', device.udid], 30);
      sleep(delay);
    }
  }

  throw new Error(`Could not boot ${device.name} (${device.udid}) after ${attempts} attempts`);
}

export function main(options = {}) {
  try {
    bootSimulator(options);
    return 0;
  } catch (error) {
    (options.io ?? process).stderr.write(`❌ ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/ios_boot_simulator.mjs')) {
  process.exitCode = main();
}
