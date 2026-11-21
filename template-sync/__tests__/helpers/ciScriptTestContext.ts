import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';

export const scripts = resolve(__dirname, '../../.github/scripts');
export const projectScripts = resolve(__dirname, '../../scripts');

// Execute real scripts against fake commands in an isolated workspace.
export function useCiScriptTestContext() {
  let root: string;
  let bin: string;
  let home: string;
  let env: NodeJS.ProcessEnv;

  function mockCommand(name: string, body: string) {
    writeFileSync(join(bin, name), `#!/bin/bash\nset -eu\n${body}\n`, {
      mode: 0o755,
    });
  }

  function run(command: string[], overrides: Partial<NodeJS.ProcessEnv> = {}) {
    const result = spawnSync(command[0], command.slice(1), {
      cwd: root,
      env: { ...env, ...overrides },
      encoding: 'utf8',
      timeout: 10_000,
    });
    if (result.error) throw result.error;
    return result;
  }

  function runScript(
    name: string,
    args: string[] = [],
    overrides: Partial<NodeJS.ProcessEnv> = {},
  ) {
    const helperDirectory = join(root, '.github/scripts');
    mkdirSync(helperDirectory, { recursive: true });
    copyFileSync(
      join(scripts, 'with_timeout.mjs'),
      join(helperDirectory, 'with_timeout.mjs'),
    );
    return run([process.execPath, join(scripts, name), ...args], overrides);
  }

  function runProjectScript(
    name: string,
    args: string[] = [],
    overrides: Partial<NodeJS.ProcessEnv> = {},
  ) {
    return run(
      [process.execPath, join(projectScripts, name), ...args],
      overrides,
    );
  }

  function read(name: string) {
    return readFileSync(join(root, name), 'utf8').trim();
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'betterhabits-ci-test-'));
    bin = join(root, 'bin');
    home = join(root, 'home');
    mkdirSync(bin);
    mkdirSync(home);
    env = {
      ...process.env,
      PATH: `${bin}${delimiter}${process.env.PATH ?? ''}`,
      HOME: home,
      SHELL: '/bin/zsh',
      GITHUB_WORKSPACE: root,
      GITHUB_ENV: join(root, 'github-env.txt'),
      GITHUB_PATH: join(root, 'github-path.txt'),
      RETRIES: '2',
      RETRY_DELAY: '0',
    };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  return {
    get root() {
      return root;
    },
    get bin() {
      return bin;
    },
    get home() {
      return home;
    },
    get env() {
      return env;
    },
    mockCommand,
    run,
    runScript,
    runProjectScript,
    read,
  };
}
