#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

function run(command, args, options, runCommand) {
  return runCommand(command, args, options);
}

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function commandStatus(result) {
  if (result.status !== null && result.status !== undefined) return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

export function verifyExpoDependencies(options = {}) {
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? spawnSync;
  const ignoredCommands = [
    ['npx', ['expo', '--version']],
    ['node', ['-e', "console.log('react-native', require('react-native/package.json').version)"]],
    ['node', ['-e', "console.log('expo', require('expo/package.json').version)"]],
  ];

  for (const [command, args] of ignoredCommands) {
    const result = run(command, args, { cwd, env, encoding: 'utf8' }, runCommand);
    printResult(result, io);
  }

  const check = run(
    'npx',
    ['expo', 'install', '--check'],
    { cwd, env, encoding: 'utf8' },
    runCommand,
  );
  printResult(check, io);
  if (commandStatus(check) !== 0) {
    io.stdout.write('⚠️ Expo dependency drift detected. Run npx expo install --fix locally to align versions.\n');
    return 1;
  }
  return 0;
}

export function main(options = {}) {
  try {
    return verifyExpoDependencies(options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/verify_expo_deps.mjs')) {
  process.exitCode = main();
}
