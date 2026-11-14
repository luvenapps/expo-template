#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
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

export function installApp(argv = process.argv.slice(2), options = {}) {
  const root = options.root ?? process.cwd();
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const runCommand = options.runCommand ?? spawnSync;
  const appPath = argv[0];

  if (!appPath) throw new Error('App path required');
  const absoluteAppPath = path.resolve(root, appPath);
  if (!existsSync(absoluteAppPath) || !statSync(absoluteAppPath).isDirectory()) return 1;

  const udidFile = path.join(root, '.simulator_udid');
  if (!existsSync(udidFile)) return 1;
  const udid = readFileSync(udidFile, 'utf8').replace(/\s/g, '');
  if (!udid) return 1;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = runWithTimeout(
      root,
      'xcrun',
      ['simctl', 'install', udid, appPath],
      120,
      env,
      runCommand,
    );
    printResult(result, io);
    if (statusOf(result) === 0) return 0;
    io.stderr.write(`Install attempt ${attempt} failed\n`);
  }
  return 1;
}

export function main(argv = process.argv.slice(2), options = {}) {
  try {
    return installApp(argv, options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/ios_install_app.mjs')) {
  process.exitCode = main();
}
