#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { appendFileSync, accessSync, constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

function versionFrom(output) {
  return output.match(/\b[0-9]+\.[0-9]+\.[0-9]+\b/)?.[0] ?? '';
}

function run(command, args, options, runCommand) {
  return runCommand(command, args, options);
}

export async function ensureFastlane(argv = process.argv.slice(2), options = {}) {
  const sourceEnv = options.env ?? process.env;
  const env = { ...sourceEnv };
  const io = options.io ?? process;
  const runCommand = options.runCommand ?? spawnSync;
  const cwd = options.cwd ?? process.cwd();
  const appendFile = options.appendFile ?? appendFileSync;
  const sleep =
    options.sleep ??
    ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const VER = argv[0];

  if (!VER) {
    io.stderr.write('Fastlane version required\n');
    return 1;
  }

  io.stdout.write(`🔧 Ensuring fastlane ${VER}...\n`);

  const rubyResult = run(
    'ruby',
    ['-e', 'require "rubygems"; print Gem.user_dir'],
    { cwd, env, encoding: 'utf8', maxBuffer: 1024 * 1024 },
    runCommand,
  );
  if (rubyResult.status !== 0 || rubyResult.error) {
    if (rubyResult.stderr) io.stderr.write(rubyResult.stderr);
    if (rubyResult.error) io.stderr.write(`${rubyResult.error.message}\n`);
    return rubyResult.status ?? 1;
  }

  const GEM_DIR = (rubyResult.stdout ?? '').replace(/\r?\n+$/, '');
  const BIN_DIR = path.join(GEM_DIR, 'bin');
  const PATH = env.PATH ?? '';
  env.PATH = [
    BIN_DIR,
    ...PATH.split(path.delimiter).filter((directory) => directory !== BIN_DIR),
  ].join(path.delimiter);
  env.GEM_HOME = GEM_DIR;
  env.GEM_PATH = GEM_DIR;

  if (env.GITHUB_PATH) appendFile(env.GITHUB_PATH, `${BIN_DIR}\n`);
  if (env.GITHUB_ENV) appendFile(env.GITHUB_ENV, `GEM_HOME=${GEM_DIR}\nGEM_PATH=${GEM_DIR}\n`);

  let CUR_VER = '';
  if (commandExists('fastlane', { ...env, PATH: BIN_DIR })) {
    const current = run(
      'fastlane',
      ['--version'],
      { cwd, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
      runCommand,
    );
    if (current.status !== 0 || current.error) {
      if (current.stderr) io.stderr.write(current.stderr);
      if (current.error) io.stderr.write(`${current.error.message}\n`);
      return current.status ?? 1;
    }
    CUR_VER = versionFrom(`${current.stdout ?? ''}${current.stderr ?? ''}`);
  }

  if (!CUR_VER || CUR_VER !== VER) {
    io.stdout.write(`📦 Installing fastlane ${VER}...\n`);
    run('gem', ['uninstall', '-aIx', 'fastlane'], { cwd, env, stdio: 'ignore' }, runCommand);
    const installation = run(
      'gem',
      ['install', '-N', '-q', '--user-install', 'fastlane', '-v', VER],
      { cwd, env, stdio: 'inherit' },
      runCommand,
    );
    if (installation.status !== 0 || installation.error) {
      if (installation.stderr) io.stderr.write(installation.stderr);
      if (installation.error) io.stderr.write(`${installation.error.message}\n`);
      return installation.status ?? 1;
    }
  } else {
    io.stdout.write(`✅ fastlane ${VER} already installed\n`);
  }

  await sleep(1000);

  if (!commandExists('fastlane', env)) {
    io.stderr.write('❌ Fastlane not found in PATH\n');
    return 1;
  }

  const actual = run(
    'fastlane',
    ['--version'],
    { cwd, env, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    runCommand,
  );
  if (actual.status !== 0 || actual.error) {
    if (actual.stderr) io.stderr.write(actual.stderr);
    if (actual.error) io.stderr.write(`${actual.error.message}\n`);
    return actual.status ?? 1;
  }

  const ACT_VER = versionFrom(`${actual.stdout ?? ''}${actual.stderr ?? ''}`);
  if (!ACT_VER) {
    io.stderr.write('❌ Could not determine fastlane version\n');
    io.stderr.write(`Full output: ${actual.stdout ?? ''}${actual.stderr ?? ''}`);
    return 1;
  }

  if (ACT_VER !== VER) {
    io.stderr.write(`❌ Fastlane version mismatch: expected ${VER}, got ${ACT_VER}\n`);
    return 1;
  }

  io.stdout.write(`✅ Fastlane ${ACT_VER} successfully installed and verified\n`);
  return 0;
}

export async function main(argv = process.argv.slice(2), options = {}) {
  try {
    return await ensureFastlane(argv, options);
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/setup_fastlane.mjs')) {
  main().then((code) => {
    process.exitCode = code;
  });
}
