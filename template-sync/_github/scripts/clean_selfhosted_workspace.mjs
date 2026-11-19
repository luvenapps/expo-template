#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  accessSync,
  constants,
  existsSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { basename, delimiter, isAbsolute, join, resolve } from 'node:path';
import process from 'node:process';

function commandExists(command, env) {
  return (env.PATH ?? '').split(delimiter).some((directory) => {
    try {
      const candidate = join(directory || '.', command);
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function localTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function say(io, message) {
  io.stdout.write(`[clean] ${message}\n`);
}

function remove(workspace, displayPath, options = {}) {
  const fileSystem = options.fileSystem;
  const io = options.io;
  const target = isAbsolute(displayPath) ? displayPath : resolve(workspace, displayPath);
  if (fileSystem.existsSync(target)) {
    say(io, `rm -rf ${displayPath}`);
    fileSystem.rmSync(target, { recursive: true, force: true });
  } else {
    say(io, `skip (missing): ${displayPath}`);
  }
}

function removeBuildPaths(workspace, paths, options) {
  for (const path of paths) {
    try {
      options.fileSystem.rmSync(resolve(workspace, path), { recursive: true, force: true });
    } catch {
      // These build outputs are best-effort cleanup in the shell implementation.
    }
  }
}

export function cleanSelfHostedWorkspace(options = {}) {
  const env = options.env ?? process.env;
  const io = options.io ?? process;
  const fileSystem = options.fileSystem ?? {
    existsSync,
    readdirSync,
    renameSync,
    rmSync,
    statSync,
  };
  const runCommand = options.runCommand ?? spawnSync;
  const workspace = resolve(env.GITHUB_WORKSPACE ?? options.cwd ?? process.cwd());
  const home = env.HOME ?? process.env.HOME ?? '';
  const fileOptions = { fileSystem, io };

  if (!fileSystem.existsSync(workspace) || !fileSystem.statSync(workspace).isDirectory()) {
    throw new Error(`No such directory: ${workspace}`);
  }

  say(io, `Workspace: ${workspace}`);

  // App and build outputs in the workspace.
  remove(workspace, 'node_modules', fileOptions);

  const artifacts = resolve(workspace, 'e2e-artifacts');
  if (fileSystem.existsSync(artifacts) && fileSystem.statSync(artifacts).isDirectory()) {
    const archive = `e2e-artifacts-${localTimestamp(options.now?.() ?? new Date())}`;
    say(io, `archiving e2e-artifacts -> ${archive}`);
    fileSystem.renameSync(artifacts, resolve(workspace, archive));

    say(io, 'cleaning old e2e-artifacts archives (keeping last 4)');
    const archives = fileSystem
      .readdirSync(workspace, { withFileTypes: true })
      .filter((entry) => entry.name.startsWith('e2e-artifacts-'))
      .map((entry) => ({
        path: resolve(workspace, entry.name),
        modified: fileSystem.statSync(resolve(workspace, entry.name)).mtimeMs,
        name: entry.name,
      }))
      .sort((left, right) => right.modified - left.modified || right.name.localeCompare(left.name));
    for (const oldArchive of archives.slice(4)) {
      try {
        fileSystem.rmSync(oldArchive.path, { recursive: true, force: true });
      } catch {
        // xargs rm -rf is best-effort in the shell implementation.
      }
    }
  } else {
    say(io, 'skip (missing): e2e-artifacts');
  }

  if (fileSystem.existsSync(resolve(workspace, 'android/app/build'))) {
    say(io, 'clean android/app/build (preserve reports)');
    removeBuildPaths(
      workspace,
      [
        'android/app/build/intermediates',
        'android/app/build/outputs',
        'android/app/build/tmp',
        'android/app/build/generated',
        'android/app/build/transforms',
      ],
      fileOptions,
    );
  } else {
    say(io, 'skip (missing): android/app/build');
  }
  remove(workspace, 'android/.gradle', fileOptions);

  if (fileSystem.existsSync(resolve(workspace, 'ios/build'))) {
    say(io, 'clean ios/build (preserve xcresult and logs)');
    removeBuildPaths(
      workspace,
      [
        'ios/build/Build/Intermediates.noindex',
        'ios/build/Build/Products',
        'ios/build/Build/GeneratedSources',
        'ios/build/Build/Index.noindex',
        'ios/build/Build/PrecompiledHeaders',
      ],
      fileOptions,
    );
  } else {
    say(io, 'skip (missing): ios/build');
  }

  remove(workspace, 'node_modules/.cache/metro', fileOptions);
  if (env.TMPDIR) {
    say(io, `rm -rf ${env.TMPDIR}/metro-*`);
    try {
      for (const entry of fileSystem.readdirSync(env.TMPDIR)) {
        if (entry.startsWith('metro-')) {
          fileSystem.rmSync(resolve(workspace, env.TMPDIR, entry), {
            recursive: true,
            force: true,
          });
        }
      }
    } catch {
      // The shell cleanup ignores missing or inaccessible TMPDIR matches.
    }
  }

  if (env.CLEAN_GLOBAL_GRADLE === '1') {
    remove(workspace, join(home, '.gradle/caches'), fileOptions);
    remove(workspace, join(home, '.gradle/wrapper'), fileOptions);
  }

  if (env.CLEAN_DERIVEDDATA === '1') {
    const derived = join(home, 'Library/Developer/Xcode/DerivedData');
    if (fileSystem.existsSync(derived)) {
      const project = basename(workspace);
      say(io, `Scanning DerivedData for project: ${project}`);
      const matches = fileSystem.readdirSync(derived).filter((entry) => entry.includes(project));
      if (matches.length > 0) {
        for (const entry of matches) remove(workspace, join(derived, entry), fileOptions);
      } else {
        say(io, 'No project-scoped DerivedData found; set CLEAN_DERIVEDDATA=all to remove all');
        /* istanbul ignore next -- the outer "1" guard makes this shell-parity case unreachable. */
        if (env.CLEAN_DERIVEDDATA === 'all') remove(workspace, derived, fileOptions);
      }
    } else {
      say(io, `skip (missing): ${derived}`);
    }
  }

  if (env.CLEAN_WATCHMAN === '1') {
    if (commandExists('watchman', env)) {
      say(io, 'watchman watch-del-all');
      runCommand('watchman', ['watch-del-all'], { cwd: workspace, env, stdio: 'inherit' });
    } else {
      say(io, 'watchman not installed, skipping');
    }
  }

  if (env.CLEAN_PNPM_STORE === '1' && commandExists('pnpm', env)) {
    say(io, 'pnpm store prune');
    runCommand('pnpm', ['store', 'prune'], { cwd: workspace, env, stdio: 'inherit' });
  }

  say(io, 'Done.');
}

export function main(options = {}) {
  try {
    cleanSelfHostedWorkspace(options);
    return 0;
  } catch (error) {
    (options.io ?? process).stderr.write(`${error.message}\n`);
    return 1;
  }
}

/* istanbul ignore next -- covered by the process.execPath CLI tests. */
if (
  process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/clean_selfhosted_workspace.mjs')
) {
  process.exitCode = main();
}
