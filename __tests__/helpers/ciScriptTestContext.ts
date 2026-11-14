import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const scripts = resolve(__dirname, '../../.github/scripts');

// Execute real CI scripts against fake commands, without devices or a network.
export function useCiScriptTestContext() {
  let root: string;
  let bin: string;
  let env: NodeJS.ProcessEnv;

  function mockCommand(name: string, body: string) {
    writeFileSync(join(bin, name), `#!/bin/bash\nset -eu\n${body}\n`, { mode: 0o755 });
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
    return run(['bash', join(scripts, name), ...args], overrides);
  }

  function read(name: string) {
    return readFileSync(join(root, name), 'utf8').trim();
  }

  function boot(overrides: Partial<NodeJS.ProcessEnv> = {}) {
    const result = runScript('ios_boot_simulator.sh', [], {
      IOS_DEVICE: 'iPhone 17',
      ...overrides,
    });
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'template-ci-test-'));
    bin = join(root, 'bin');
    mkdirSync(bin);
    env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      GITHUB_WORKSPACE: root,
      RETRIES: '2',
      RETRY_DELAY: '0',
    };
    mockCommand('git', 'printf "%s\\n" "${MOCK_TREE:-tree-one}"');
    mockCommand(
      'xcode-select',
      'printf "%s\\n" "$GITHUB_WORKSPACE/DevTools/Xcode.app/Contents/Developer"',
    );
    mockCommand('open', 'printf "%s\\n" "$*" >> commands.log');
    mockCommand(
      'xcrun',
      `echo "$*" >> commands.log
case "$*" in
  'simctl list devices available --json')
    echo '{"devices":{"iOS":[{"name":"iPhone 17","udid":"test-udid"}]}}' ;;
  'simctl bootstatus test-udid -b')
    if [ "\${BOOT_FAIL:-}" = always ]; then exit 1; fi
    if [ "\${BOOT_FAIL:-}" = once ] && [ ! -f boot-retried ]; then touch boot-retried; exit 1; fi ;;
  'simctl install '*) [ "\${INSTALL_FAIL:-}" != always ] ;;
esac`,
    );
    mockCommand(
      'maestro',
      `echo "$*" >> maestro-commands.log
if [ "\${TEST_FAIL:-}" = always ]; then exit 1; fi
if [ "\${TEST_FAIL:-}" = once ] && [ ! -f test-retried ]; then touch test-retried; exit 1; fi`,
    );
    mkdirSync(
      join(root, 'DevTools/Xcode.app/Contents/Applications/DeviceHub.app'),
      { recursive: true },
    );
    mkdirSync(
      join(root, 'DevTools/Xcode.app/Contents/Developer/Applications/Simulator.app'),
      { recursive: true },
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  return {
    get root() {
      return root;
    },
    mockCommand,
    run,
    runScript,
    read,
    boot,
  };
}
