#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const LOCKFILES = [
  { file: 'package-lock.json', manager: 'npm' },
  { file: 'pnpm-lock.yaml', manager: 'pnpm' },
];

function existingLockfiles(projectDirectory) {
  return LOCKFILES.filter(({ file }) =>
    fs.existsSync(path.join(projectDirectory, file)),
  );
}

export function detectPackageManager(projectDirectory = process.cwd()) {
  const locks = existingLockfiles(projectDirectory);
  if (locks.length !== 1) {
    const found = locks.map(({ file }) => file).join(', ') || 'none';
    throw new Error(
      'Generated app must contain exactly one supported lockfile (package-lock.json or pnpm-lock.yaml); found ' +
        found +
        '.',
    );
  }
  return locks[0].manager;
}

export function packageManagerCommand(manager, operation, args = []) {
  if (manager !== 'npm' && manager !== 'pnpm') {
    throw new Error('Unsupported generated app package manager: ' + manager);
  }

  if (operation === 'install') {
    return manager === 'npm'
      ? ['npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund']]
      : [
          'pnpm',
          [
            'install',
            '--frozen-lockfile',
            '--prefer-offline',
            '--reporter=append-only',
          ],
        ];
  }

  if (operation === 'run') {
    const [script, ...scriptArgs] = args;
    if (!script) throw new Error('Provide an app script name after "run".');
    const separator = scriptArgs.length ? ['--', ...scriptArgs] : [];
    return manager === 'npm'
      ? ['npm', ['run', script, ...separator]]
      : ['pnpm', ['run', script, ...separator]];
  }

  if (operation === 'exec') {
    if (!args[0]) throw new Error('Provide a binary name after "exec".');
    return manager === 'npm'
      ? ['npm', ['exec', '--', ...args]]
      : ['pnpm', ['exec', ...args]];
  }

  if (operation === 'dlx') {
    if (!args[0]) throw new Error('Provide a package name after "dlx".');
    return manager === 'npm'
      ? ['npx', ['--yes', ...args]]
      : ['pnpm', ['dlx', ...args]];
  }

  throw new Error('Unknown package manager operation: ' + operation);
}

export function runPackageManager(manager, operation, args = [], options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const runCommand = options.runCommand ?? spawnSync;
  const [command, commandArgs] = packageManagerCommand(
    manager,
    operation,
    args,
  );
  const result = runCommand(command, commandArgs, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: options.stdio ?? 'inherit',
  });

  if (result.error) throw result.error;
  return result.status ?? 1;
}

function writeSelection(manager, env = process.env) {
  if (env.GITHUB_OUTPUT) {
    fs.appendFileSync(env.GITHUB_OUTPUT, 'manager=' + manager + '\n');
  }
  if (env.GITHUB_ENV) {
    fs.appendFileSync(env.GITHUB_ENV, 'APP_PACKAGE_MANAGER=' + manager + '\n');
  }
}

export function stageGeneratedApp(projectDirectory, templateDirectory) {
  const projectRoot = path.resolve(projectDirectory);
  const templateRoot = path.resolve(templateDirectory);
  const templateManager = detectPackageManager(templateRoot);
  const templateLock = LOCKFILES.find(
    ({ manager }) => manager === templateManager,
  );
  const appLocks = existingLockfiles(projectRoot);

  if (appLocks.length === 0) {
    fs.copyFileSync(
      path.join(templateRoot, templateLock.file),
      path.join(projectRoot, templateLock.file),
    );
  } else if (appLocks.length !== 1 || appLocks[0].manager !== templateManager) {
    const found = appLocks.map(({ file }) => file).join(', ') || 'none';
    throw new Error(
      'Scaffolded app lockfile does not match template-sync (' +
        templateLock.file +
        '); found ' +
        found +
        '.',
    );
  }

  return detectPackageManager(projectRoot);
}

function main(argv = process.argv.slice(2), env = process.env) {
  const [operation, firstArg, ...rest] = argv;
  let manager;

  if (operation === 'stage') {
    if (!firstArg || !rest[0])
      throw new Error('Usage: stage <generated-app-dir> <template-sync-dir>');
    manager = stageGeneratedApp(firstArg, rest[0]);
  } else {
    const projectDirectory =
      operation === 'detect' ? (firstArg ?? process.cwd()) : process.cwd();
    manager = detectPackageManager(projectDirectory);

    if (operation === 'detect') {
      process.stdout.write(manager + '\n');
    } else {
      const restArgs = rest[0] === '--' ? rest.slice(1) : rest;
      const args =
        operation === 'run' || operation === 'exec' || operation === 'dlx'
          ? [firstArg, ...restArgs].filter(Boolean)
          : [];
      const exitCode = runPackageManager(manager, operation, args, {
        cwd: projectDirectory,
        env,
      });
      if (exitCode !== 0) return exitCode;
    }
  }

  if (operation === 'stage' || operation === 'detect')
    writeSelection(manager, env);
  return 0;
}

if (
  process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith('/.github/scripts/generated-app-package-manager.mjs')
) {
  try {
    process.exitCode = main();
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
