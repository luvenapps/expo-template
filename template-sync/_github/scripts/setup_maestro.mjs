#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { accessSync, appendFileSync, constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const INSTALL_URL = 'https://get.maestro.mobile.dev';

function commandExists(command, env) {
  return (env.PATH ?? '').split(path.delimiter).some((directory) => {
    try {
      accessSync(path.join(directory || '.', command), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function statusOf(result) {
  if (result.status !== null && result.status !== undefined) return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

function run(command, args, options, runCommand) {
  return runCommand(command, args, options);
}

export function setupMaestro(argv = process.argv.slice(2), options = {}) {
  const sourceEnv = options.env ?? process.env;
  const env = { ...sourceEnv };
  const io = options.io ?? process;
  const runCommand = options.runCommand ?? spawnSync;
  const cwd = options.cwd ?? process.cwd();
  const appendFile = options.appendFile ?? appendFileSync;
  const VERSION = argv[0] || 'latest';

  if (commandExists('maestro', env)) {
    const current = run('maestro', ['--version'], { cwd, env, encoding: 'utf8' }, runCommand);
    io.stdout.write(`✅ Maestro already installed: ${(current.stdout ?? '').trim()}\n`);
    if (current.stderr) io.stderr.write(current.stderr);
    return 0;
  }

  io.stdout.write(`📦 Installing Maestro CLI (${VERSION})...\n`);
  env.MAESTRO_VERSION = VERSION;

  const downloadCommand = commandExists('curl', env)
    ? ['curl', ['-fsSL', INSTALL_URL]]
    : commandExists('wget', env)
      ? ['wget', ['-qO-', INSTALL_URL]]
      : null;
  if (!downloadCommand) {
    io.stderr.write('❌ curl or wget required to install Maestro\n');
    return 1;
  }

  const download = run(
    downloadCommand[0],
    downloadCommand[1],
    { cwd, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    runCommand,
  );
  const installation = run(
    'bash',
    ['-s'],
    { cwd, env, input: download.stdout ?? '', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    runCommand,
  );
  printResult(installation, io);
  if (statusOf(installation) !== 0) return statusOf(installation);
  if (statusOf(download) !== 0) return statusOf(download);

  const maestroBin = `${env.HOME ?? ''}/.maestro/bin`;
  env.PATH = `${maestroBin}${path.delimiter}${env.PATH ?? ''}`;
  if (env.GITHUB_PATH) appendFile(env.GITHUB_PATH, `${maestroBin}\n`);

  if (!commandExists('maestro', env)) {
    io.stderr.write('❌ Maestro installation failed\n');
    return 1;
  }

  const installed = run('maestro', ['--version'], { cwd, env, encoding: 'utf8' }, runCommand);
  io.stdout.write(`✅ Maestro installed successfully: ${(installed.stdout ?? '').trim()}\n`);
  if (installed.stderr) io.stderr.write(installed.stderr);
  return 0;
}

export function main(argv = process.argv.slice(2), options = {}) {
  try {
    return setupMaestro(argv, options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

/* istanbul ignore next -- exercised as a process.execPath CLI by the test context. */
if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/setup_maestro.mjs')) {
  process.exitCode = main();
}
