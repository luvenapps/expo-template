#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { accessSync, appendFileSync, constants, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const FASTLANE_VERSION = '2.228.0';
const MAESTRO_VERSION = '2.0.6';

function commandStatus(result) {
  if (result.status !== null && result.status !== undefined) return result.status;
  return result.error?.code === 'ENOENT' ? 127 : 1;
}

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function run(command, args, options, runCommand) {
  return runCommand(command, args, options);
}

function readMinimumMiseVersion(filePath) {
  const config = readFileSync(filePath, 'utf8');
  const value = config.match(/^min_version\s*=\s*"([^"]*)"/m)?.[1];
  if (!value) throw new Error(`Unable to read min_version from ${filePath}`);
  return value;
}

export function setupLocalDependencies(options = {}) {
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const cwd = options.cwd ?? process.cwd();
  const runCommand = options.runCommand ?? spawnSync;
  const appendFile = options.appendFile ?? appendFileSync;
  const hasCommand =
    options.commandExists ??
    ((command) => {
      const directories = (env.PATH ?? '').split(path.delimiter);
      return directories.some((directory) => {
        try {
          accessSync(path.join(directory || '.', command), constants.X_OK);
          return true;
        } catch {
          return false;
        }
      });
    });
  const baseOptions = { cwd, env, encoding: 'utf8' };
  const runAndPrint = (command, args, extra = {}) => {
    const result = run(command, args, { ...baseOptions, stdio: 'inherit', ...extra }, runCommand);
    printResult(result, io);
    return result;
  };
  const runCapture = (command, args, extra = {}) =>
    run(
      command,
      args,
      { ...baseOptions, stdio: ['ignore', 'pipe', 'ignore'], ...extra },
      runCommand,
    );
  const failIfCommandFailed = (result) => commandStatus(result) !== 0;

  const miseConfig =
    options.miseConfig ??
    path.resolve(
      path.dirname(process.argv[1] ?? path.join(cwd, 'scripts/setup-local-deps.mjs')),
      '../.mise.toml',
    );
  const MISE_VERSION = readMinimumMiseVersion(miseConfig);

  if (!hasCommand('brew')) {
    io.stdout.write(
      'Homebrew is required for this setup script. Install it from https://brew.sh/ and re-run.\n',
    );
    return 1;
  }

  for (const packageName of ['watchman']) {
    if (commandStatus(runCapture('brew', ['list', '--versions', packageName])) === 0) {
      io.stdout.write(`✅ ${packageName} already installed; skipping\n`);
    } else {
      io.stdout.write(`📦 Installing ${packageName} via Homebrew...\n`);
      const install = runAndPrint('brew', ['install', packageName]);
      if (failIfCommandFailed(install)) return commandStatus(install);
    }
  }

  if (commandStatus(runCapture('brew', ['list', '--versions', 'mise'])) === 0) {
    io.stdout.write('✅ mise already installed; skipping\n');
  } else {
    io.stdout.write(`📦 Installing mise (required >= ${MISE_VERSION}) via Homebrew...\n`);
    const install = runAndPrint('brew', ['install', 'mise']);
    if (failIfCommandFailed(install)) return commandStatus(install);
  }

  const fastlaneList = runCapture('brew', ['list', '--versions', 'fastlane']);
  if (commandStatus(fastlaneList) !== 0) return commandStatus(fastlaneList);
  const installedFastlane = (fastlaneList.stdout ?? '')
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/)[1] ?? '')
    .filter(Boolean)
    .join('\n');
  if (installedFastlane === FASTLANE_VERSION) {
    io.stdout.write(`✅ fastlane ${FASTLANE_VERSION} already installed; skipping\n`);
  } else {
    io.stdout.write(`📦 Installing fastlane ${FASTLANE_VERSION} via Homebrew...\n`);
    const pinned = runAndPrint('brew', ['install', `fastlane@${FASTLANE_VERSION}`], {
      stdio: ['inherit', 'inherit', 'ignore'],
    });
    if (failIfCommandFailed(pinned)) {
      const fallback = runAndPrint('brew', ['install', 'fastlane']);
      if (failIfCommandFailed(fallback)) return commandStatus(fallback);
    }
  }

  const maestroList = runCapture('brew', ['list', '--cask', '--versions', 'maestro']);
  const maestroInstalled =
    commandStatus(maestroList) === 0 && new RegExp(MAESTRO_VERSION).test(maestroList.stdout ?? '');
  if (maestroInstalled) {
    io.stdout.write(`✅ maestro ${MAESTRO_VERSION} already installed; skipping\n`);
  } else {
    io.stdout.write(`📦 Installing maestro ${MAESTRO_VERSION} via Homebrew...\n`);
    const install = runAndPrint('brew', ['install', '--cask', 'maestro']);
    if (failIfCommandFailed(install)) return commandStatus(install);
  }

  io.stdout.write('🔐 Trusting repo-local mise config...\n');
  const trust = runAndPrint('mise', ['trust']);
  if (failIfCommandFailed(trust)) return commandStatus(trust);
  io.stdout.write('⬇️ Installing pinned runtimes from .mise.toml...\n');
  const installRuntime = runAndPrint('mise', ['install']);
  if (failIfCommandFailed(installRuntime)) return commandStatus(installRuntime);

  let activateCommand = 'eval "$(mise activate zsh)"';
  let shellRc = `${env.HOME ?? ''}/.zshrc`;
  if (env.SHELL === '/bin/bash' || env.SHELL === '/usr/bin/bash') {
    activateCommand = 'eval "$(mise activate bash)"';
    shellRc = `${env.HOME ?? ''}/.bashrc`;
  }

  let shellProfile = '';
  try {
    shellProfile = readFileSync(shellRc, 'utf8');
  } catch {}
  if (!shellProfile.includes('mise activate')) {
    appendFile(shellRc, `\n# Added by template setup:local\n${activateCommand}\n`);
    io.stdout.write(
      `🐚 Added mise activation to ${shellRc} — restart your terminal or run: source ${shellRc}\n`,
    );
  } else {
    io.stdout.write(`✅ mise activation already present in ${shellRc}\n`);
  }

  io.stdout.write('Toolchain check:\n');
  for (const [command, args] of [
    ['mise', ['ls']],
    ['mise', ['exec', '--', 'node', '-v']],
    ['mise', ['exec', '--', 'npm', '-v']],
    ['mise', ['exec', '--', 'java', '-version']],
  ]) {
    printResult(run(command, args, { ...baseOptions, stdio: 'inherit' }, runCommand), io);
  }

  io.stdout.write('Next step: npm ci\n');
  return 0;
}

export function main(options = {}) {
  try {
    return setupLocalDependencies(options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/setup-local-deps.mjs')) {
  process.exitCode = main();
}
