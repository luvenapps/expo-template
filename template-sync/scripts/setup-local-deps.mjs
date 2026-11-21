#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { accessSync, appendFileSync, constants, existsSync, readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import process from 'node:process';
const FASTLANE_VERSION = '2.228.0';
const MAESTRO_VERSION = '2.0.6';

function commandExists(command, env) {
  return (env.PATH ?? '').split(delimiter).some((directory) => {
    try {
      accessSync(join(directory || '.', command), constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function statusOf(result) {
  if (result.status !== null && result.status !== undefined) return result.status;
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

function printResult(result, io) {
  if (result.stdout) io.stdout.write(result.stdout);
  if (result.stderr) io.stderr.write(result.stderr);
  if (result.error) io.stderr.write(`${result.error.message}\n`);
}

function listInstalled(runCommand, root, env, packageName, options = {}) {
  const args = options.cask
    ? ['list', '--cask', '--versions', packageName]
    : ['list', '--versions', packageName];
  return run('brew', args, root, env, runCommand);
}

export function setupLocalDependencies(options = {}) {
  const root = options.root ?? process.cwd();
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const runCommand = options.runCommand ?? spawnSync;
  const fileSystem = options.fileSystem ?? { appendFileSync, existsSync, readFileSync };

  let miseVersion = '';
  const miseConfig = options.miseConfig ?? join(root, '.mise.toml');
  if (fileSystem.existsSync(miseConfig)) {
    const config = fileSystem.readFileSync(miseConfig, 'utf8');
    miseVersion = config.match(/^min_version\s*=\s*"([^"]+)"/m)?.[1] ?? '';
  }

  if (!commandExists('brew', env)) {
    io.stdout.write(
      'Homebrew is required for this setup script. Install it from https://brew.sh/ and re-run.\n',
    );
    return 1;
  }

  const packages = ['watchman'];
  for (const packageName of packages) {
    const installed = listInstalled(runCommand, root, env, packageName);
    if (statusOf(installed) === 0) {
      io.stdout.write(`✅ ${packageName} already installed; skipping\n`);
    } else {
      io.stdout.write(`📦 Installing ${packageName} via Homebrew...\n`);
      const installation = run('brew', ['install', packageName], root, env, runCommand);
      printResult(installation, io);
      if (statusOf(installation) !== 0) return statusOf(installation);
    }
  }

  const mise = listInstalled(runCommand, root, env, 'mise');
  if (statusOf(mise) === 0) {
    io.stdout.write('✅ mise already installed; skipping\n');
  } else {
    io.stdout.write(`📦 Installing mise (required >= ${miseVersion}) via Homebrew...\n`);
    const installation = run('brew', ['install', 'mise'], root, env, runCommand);
    printResult(installation, io);
    if (statusOf(installation) !== 0) return statusOf(installation);
  }

  const fastlane = listInstalled(runCommand, root, env, 'fastlane');
  const installedFastlaneVersion = (fastlane.stdout ?? '').trim().split(/\s+/)[1] ?? '';
  if (installedFastlaneVersion === FASTLANE_VERSION) {
    io.stdout.write(`✅ fastlane ${FASTLANE_VERSION} already installed; skipping\n`);
  } else {
    io.stdout.write(`📦 Installing fastlane ${FASTLANE_VERSION} via Homebrew...\n`);
    const pinnedInstall = run(
      'brew',
      ['install', `fastlane@${FASTLANE_VERSION}`],
      root,
      env,
      runCommand,
    );
    printResult(pinnedInstall, io);
    if (statusOf(pinnedInstall) !== 0) {
      const fallbackInstall = run('brew', ['install', 'fastlane'], root, env, runCommand);
      printResult(fallbackInstall, io);
      if (statusOf(fallbackInstall) !== 0) return statusOf(fallbackInstall);
    }
  }

  const maestro = listInstalled(runCommand, root, env, 'maestro', { cask: true });
  if ((maestro.stdout ?? '').includes(MAESTRO_VERSION)) {
    io.stdout.write(`✅ maestro ${MAESTRO_VERSION} already installed; skipping\n`);
  } else {
    io.stdout.write(`📦 Installing maestro ${MAESTRO_VERSION} via Homebrew...\n`);
    const installation = run('brew', ['install', '--cask', 'maestro'], root, env, runCommand);
    printResult(installation, io);
    if (statusOf(installation) !== 0) return statusOf(installation);
  }

  io.stdout.write('🔐 Trusting repo-local mise config...\n');
  const trust = run('mise', ['trust'], root, env, runCommand);
  printResult(trust, io);
  if (statusOf(trust) !== 0) return statusOf(trust);

  io.stdout.write('⬇️ Installing pinned runtimes from .mise.toml...\n');
  const installRuntimes = run('mise', ['install'], root, env, runCommand);
  printResult(installRuntimes, io);
  if (statusOf(installRuntimes) !== 0) return statusOf(installRuntimes);

  const home = env.HOME ?? '';
  const useBash = env.SHELL === '/bin/bash' || env.SHELL === '/usr/bin/bash';
  const activateCommand = useBash ? 'eval "$(mise activate bash)"' : 'eval "$(mise activate zsh)"';
  const shellRc = join(home, useBash ? '.bashrc' : '.zshrc');
  let shellConfiguration = '';
  try {
    shellConfiguration = fileSystem.readFileSync(shellRc, 'utf8');
  } catch {
    // The shell script treats a missing rc file as not yet activated.
  }

  if (!shellConfiguration.includes('mise activate')) {
    fileSystem.appendFileSync(
      shellRc,
      `\n# Added by betterhabits setup:local\n${activateCommand}\n`,
    );
    io.stdout.write(
      `🐚 Added mise activation to ${shellRc} — restart your terminal or run: source ${shellRc}\n`,
    );
  } else {
    io.stdout.write('✅ mise activation already present in ' + shellRc + '\n');
  }

  io.stdout.write('Toolchain check:\n');
  for (const [command, args] of [
    ['mise', ['ls']],
    ['mise', ['exec', '--', 'node', '-v']],
    ['mise', ['exec', '--', 'pnpm', '--version']],
    ['mise', ['exec', '--', 'java', '-version']],
  ]) {
    printResult(run(command, args, root, env, runCommand), io);
  }
  io.stdout.write('Next step: pnpm install --frozen-lockfile\n');
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
