#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function say(message, io) {
  io.stdout.write(`[clean] ${message}\n`);
}

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

function removeIfPresent(target) {
  rmSync(target, { recursive: true, force: true });
}

function removeBestEffort(target) {
  try {
    removeIfPresent(target);
  } catch {}
}

function archiveTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function cleanSelfhostedWorkspace(options = {}) {
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const runCommand = options.runCommand ?? spawnSync;
  const hasCommand = options.commandExists ?? commandExists;
  const WORKSPACE = env.GITHUB_WORKSPACE || options.cwd || process.cwd();
  const workspace = path.resolve(WORKSPACE);
  statSync(workspace);
  const relativePath = (value) => path.join(workspace, value);
  const action = (displayPath, targetPath = relativePath(displayPath)) => {
    if (existsSync(targetPath)) {
      say(`rm -rf ${displayPath}`, io);
      removeIfPresent(targetPath);
    } else {
      say(`skip (missing): ${displayPath}`, io);
    }
  };
  const runIgnoringFailure = (command, args) => {
    runCommand(command, args, { cwd: workspace, env, stdio: 'inherit' });
  };

  say(`Workspace: ${WORKSPACE}`, io);

  // 1) App & build outputs (workspace)
  action('node_modules');

  const artifacts = relativePath('e2e-artifacts');
  if (existsSync(artifacts) && statSync(artifacts).isDirectory()) {
    const TIMESTAMP = archiveTimestamp(options.now?.() ?? new Date());
    say(`archiving e2e-artifacts -> e2e-artifacts-${TIMESTAMP}`, io);
    renameSync(artifacts, relativePath(`e2e-artifacts-${TIMESTAMP}`));

    say('cleaning old e2e-artifacts archives (keeping last 4)', io);
    const archives = readdirSync(workspace)
      .filter((name) => name.startsWith('e2e-artifacts-'))
      .map((name) => ({
        name,
        modified: lstatSync(relativePath(name)).mtimeMs,
      }))
      .sort((left, right) => right.modified - left.modified);
    for (const archive of archives.slice(4)) removeBestEffort(relativePath(archive.name));
  } else {
    say('skip (missing): e2e-artifacts', io);
  }

  const androidBuild = relativePath('android/app/build');
  if (existsSync(androidBuild) && statSync(androidBuild).isDirectory()) {
    say('clean android/app/build (preserve reports)', io);
    for (const target of ['intermediates', 'outputs', 'tmp', 'generated', 'transforms']) {
      removeBestEffort(path.join(androidBuild, target));
    }
  } else {
    say('skip (missing): android/app/build', io);
  }
  action('android/.gradle');

  const iosBuild = relativePath('ios/build');
  if (existsSync(iosBuild) && statSync(iosBuild).isDirectory()) {
    say('clean ios/build (preserve xcresult and logs)', io);
    for (const target of [
      'Build/Intermediates.noindex',
      'Build/Products',
      'Build/GeneratedSources',
      'Build/Index.noindex',
      'Build/PrecompiledHeaders',
    ]) {
      removeBestEffort(path.join(iosBuild, target));
    }
  } else {
    say('skip (missing): ios/build', io);
  }

  action('node_modules/.cache/metro');
  if (env.TMPDIR) {
    say(`rm -rf ${env.TMPDIR}/metro-*`, io);
    try {
      for (const name of readdirSync(env.TMPDIR).filter((entry) => entry.startsWith('metro-'))) {
        removeBestEffort(path.join(env.TMPDIR, name));
      }
    } catch {}
  }

  // 2) Optional: global Gradle caches (useful if they get corrupted on self-hosted)
  if (env.CLEAN_GLOBAL_GRADLE === '1') {
    action('$HOME/.gradle/caches', path.resolve(`${env.HOME ?? ''}/.gradle/caches`));
    action('$HOME/.gradle/wrapper', path.resolve(`${env.HOME ?? ''}/.gradle/wrapper`));
  }

  // 3) Optional: Xcode DerivedData (scoped if possible)
  if (env.CLEAN_DERIVEDDATA === '1') {
    const DERIVED = path.resolve(`${env.HOME ?? ''}/Library/Developer/Xcode/DerivedData`);
    if (existsSync(DERIVED)) {
      const PROJ = path.basename(workspace);
      say(`Scanning DerivedData for project: ${PROJ}`, io);
      const matching = readdirSync(DERIVED).filter((name) => name.includes(PROJ));
      if (matching.length) {
        for (const name of matching) action(path.join(DERIVED, name), path.join(DERIVED, name));
      } else {
        say('No project-scoped DerivedData found; set CLEAN_DERIVEDDATA=all to remove all', io);
        if (env.CLEAN_DERIVEDDATA === 'all') action(DERIVED, DERIVED);
      }
    } else {
      say(`skip (missing): ${DERIVED}`, io);
    }
  }

  // 4) Optional: Watchman
  if (env.CLEAN_WATCHMAN === '1') {
    if (hasCommand('watchman', env)) {
      say('watchman watch-del-all', io);
      runIgnoringFailure('watchman', ['watch-del-all']);
    } else {
      say('watchman not installed, skipping', io);
    }
  }

  // 5) Optional: npm cache maintenance
  if (env.CLEAN_NPM_CACHE === '1' && hasCommand('npm', env)) {
    say('npm cache verify', io);
    runIgnoringFailure('npm', ['cache', 'verify']);
    say('npm cache clean --force', io);
    runIgnoringFailure('npm', ['cache', 'clean', '--force']);
  }

  say('Done.', io);
}

export function main(options = {}) {
  try {
    cleanSelfhostedWorkspace(options);
    return 0;
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

if (
  process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/clean_selfhosted_workspace.mjs')
) {
  process.exitCode = main();
}
