#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function statusOf(result) {
  if (result.status !== null && result.status !== undefined) return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

function run(command, args, root, env, runCommand) {
  return runCommand(command, args, { cwd: root, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

function runWithTimeout(root, command, args, seconds, env, runCommand) {
  const helper = path.join(root, '.github/scripts/with_timeout.mjs');
  return run(process.execPath, [helper, String(seconds), command, ...args], root, env, runCommand);
}

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function readDeviceId(deviceJson, requested) {
  const devices = Object.values(JSON.parse(deviceJson).devices ?? {}).flat();
  const matching = requested
    ? devices.filter((device) => device.name === requested)
    : devices.filter((device) => device.name.startsWith('iPhone'));
  if (!matching.length) throw new Error(`No available simulator matching ${requested || 'iPhone'}`);
  return matching[0].udid;
}

function openSimulatorUI(root, env, io, runCommand) {
  const developerResult = run('xcode-select', ['-p'], root, env, runCommand);
  printResult({ ...developerResult, stdout: '' }, io);
  if (statusOf(developerResult) !== 0) return statusOf(developerResult);

  const developerDir = (developerResult.stdout ?? '').trim();
  const suffix = '/Contents/Developer';
  const xcodeApp = developerDir.endsWith(suffix)
    ? developerDir.slice(0, -suffix.length)
    : developerDir;
  const deviceHubApp = path.join(xcodeApp, 'Contents/Applications/DeviceHub.app');
  const simulatorApp = path.join(developerDir, 'Applications/Simulator.app');
  let app;
  if (existsSync(deviceHubApp)) {
    io.stdout.write('📱 Opening Device Hub...\n');
    app = deviceHubApp;
  } else if (existsSync(simulatorApp)) {
    io.stdout.write('📱 Opening Simulator...\n');
    app = simulatorApp;
  } else {
    io.stderr.write('❌ No simulator UI found in the active Xcode installation\n');
    io.stderr.write(`   Active Developer directory: ${developerDir}\n`);
    io.stderr.write(`   Expected Device Hub: ${deviceHubApp}\n`);
    io.stderr.write(`   Expected Simulator: ${simulatorApp}\n`);
    return 1;
  }

  const opened = run('open', ['-a', app], root, env, runCommand);
  printResult(opened, io);
  return statusOf(opened);
}

export function bootSimulator(options = {}) {
  const root = options.root ?? process.cwd();
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const runCommand = options.runCommand ?? spawnSync;
  const sleep = options.sleep ?? ((seconds) => run('sleep', [String(seconds)], root, env, runCommand));
  const artifacts = path.join(root, 'e2e-artifacts');
  const udidFile = path.join(root, '.simulator_udid');
  mkdirSync(artifacts, { recursive: true });
  if (existsSync(udidFile)) unlinkSync(udidFile);

  const deviceName = env.IOS_DEVICE ?? '';
  const list = runWithTimeout(
    root,
    'xcrun',
    ['simctl', 'list', 'devices', 'available', '--json'],
    30,
    env,
    runCommand,
  );
  printResult({ ...list, stdout: '' }, io);
  writeFileSync(path.join(artifacts, 'devices.json'), list.stdout ?? '');
  if (statusOf(list) !== 0) return statusOf(list);

  let udid;
  try {
    udid = readDeviceId(list.stdout ?? '', deviceName);
  } catch (error) {
    io.stderr.write(`${error.message}\n`);
    return 1;
  }

  const attempts = Number(env.RETRIES || '2');
  const delay = Number(env.RETRY_DELAY || '2');
  if (!Number.isInteger(attempts) || attempts < 1 || !Number.isFinite(delay) || delay < 0) {
    io.stderr.write('RETRIES must be a positive integer and RETRY_DELAY must be non-negative\n');
    return 1;
  }

  const bootstatusLog = path.join(artifacts, 'bootstatus.log');
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    io.stdout.write(`Booting ${udid} (attempt ${attempt}/${attempts})\n`);
    const boot = runWithTimeout(
      root,
      'xcrun',
      ['simctl', 'bootstatus', udid, '-b'],
      180,
      env,
      runCommand,
    );
    writeFileSync(bootstatusLog, `${boot.stdout ?? ''}${boot.stderr ?? ''}`);
    if (statusOf(boot) === 0) {
      io.stdout.write(readFileContents(bootstatusLog));
      const opened = openSimulatorUI(root, env, io, runCommand);
      if (opened !== 0) return opened;
      writeFileSync(udidFile, `${udid}\n`);
      return 0;
    }

    io.stdout.write(readFileContents(bootstatusLog));
    if (attempt < attempts) {
      runWithTimeout(root, 'xcrun', ['simctl', 'shutdown', udid], 30, env, runCommand);
      runWithTimeout(root, 'xcrun', ['simctl', 'erase', udid], 30, env, runCommand);
      const slept = sleep(delay);
      if (slept && statusOf(slept) !== 0) return statusOf(slept);
    }
  }

  io.stderr.write('Simulator failed to become ready within the boot deadline\n');
  return 1;
}

function readFileContents(filePath) {
  return readFileSync(filePath, 'utf8');
}

export function main(options = {}) {
  try {
    return bootSimulator(options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/ios_boot_simulator.mjs')) {
  process.exitCode = main();
}
