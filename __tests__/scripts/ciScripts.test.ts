/** @jest-environment node */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const scripts = resolve(__dirname, '../../.github/scripts');

// Execute the real shell scripts against fake platform commands, without devices or a network.
describe('hosted CI scripts', () => {
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
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('cache keys are stable and emit only the Actions output', () => {
    const first = runScript('compute_ci_cache_key.sh', ['ios']);
    const second = runScript('compute_ci_cache_key.sh', ['ios']);
    expect(first.status).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    expect(first.stdout).toMatch(/^key=template-release-v1-ios-[a-f0-9]{64}\n$/);
  });

  test.each([
    { MOCK_TREE: 'changed-source' },
    { EXPO_PUBLIC_API_URL: 'changed' },
    { GOOGLE_SERVICE_INFO_PLIST_B64: 'changed' },
    { ImageVersion: 'changed' },
    { EAS_CLI_VERSION: 'changed' },
  ])('invalidates the cached artifact when build inputs change: %j', (overrides) => {
    const original = runScript('compute_ci_cache_key.sh', ['ios']);
    const changed = runScript('compute_ci_cache_key.sh', ['ios'], overrides);
    expect(original.status).toBe(0);
    expect(changed.status).toBe(0);
    expect(changed.stdout).not.toBe(original.stdout);
  });

  test('uses separate artifact keys for each platform', () => {
    expect(runScript('compute_ci_cache_key.sh', ['android']).stdout).not.toBe(
      runScript('compute_ci_cache_key.sh', ['ios']).stdout,
    );
  });

  test('cache keys ignore the workflow run identity', () => {
    const original = runScript('compute_ci_cache_key.sh', ['ios']);
    const rerun = runScript('compute_ci_cache_key.sh', ['ios'], {
      GITHUB_RUN_ATTEMPT: '2',
      GITHUB_RUN_ID: 'different',
    });
    expect(rerun.stdout).toBe(original.stdout);
  });

  test('rejects an unsupported cache platform', () => {
    expect(runScript('compute_ci_cache_key.sh', ['web']).status).not.toBe(0);
  });

  test('limits the app and CocoaPods simulator architectures while preserving device settings', () => {
    const projects = ['ios/Example.xcodeproj', 'ios/Pods/Pods.xcodeproj'];
    for (const project of projects) {
      mkdirSync(join(root, project), { recursive: true });
      writeFileSync(
        join(root, project, 'project.pbxproj'),
        `// !$*UTF8*$!
{
  archiveVersion = 1;
  classes = {};
  objectVersion = 46;
  objects = {
/* Begin XCBuildConfiguration section */
    A00000000000000000000001 /* Release */ = {
      isa = XCBuildConfiguration;
      buildSettings = {
        ARCHS = "$(ARCHS_STANDARD)";
        "ARCHS[sdk=iphoneos*]" = arm64;
        PRODUCT_NAME = Example;
      };
      name = Release;
    };
/* End XCBuildConfiguration section */
  };
  rootObject = A00000000000000000000001;
}
`,
      );
    }
    const command = [process.execPath, join(scripts, 'ios_simulator_arch.cjs')];
    expect(run(command).status).toBe(0);
    for (const project of projects) {
      const contents = read(`${project}/project.pbxproj`);
      expect(contents).toContain('"ARCHS[sdk=iphonesimulator*]" = arm64;');
      expect(contents).toContain('"ARCHS[sdk=iphoneos*]" = arm64;');
      expect(contents).toContain('ARCHS = "$(ARCHS_STANDARD)";');
      expect(contents).toContain('PRODUCT_NAME = Example;');
    }
    const first = read(`${projects[0]}/project.pbxproj`);
    expect(run(command).status).toBe(0);
    expect(read(`${projects[0]}/project.pbxproj`)).toBe(first);
  });

  test('fails when the native app has not been generated yet', () => {
    expect(run([process.execPath, join(scripts, 'ios_simulator_arch.cjs')]).status).not.toBe(0);
  });

  test('records the ready simulator without resetting it', () => {
    boot();
    expect(read('.simulator_udid')).toBe('test-udid');
    expect(read('commands.log')).toContain('simctl bootstatus test-udid -b');
    expect(read('commands.log')).not.toMatch(/shutdown|erase/);
  });

  test('recovers from a failed boot with one reset', () => {
    boot({ BOOT_FAIL: 'once' });
    const commands = read('commands.log').split('\n');
    expect(commands.filter((line) => line.includes('bootstatus'))).toHaveLength(2);
    expect(commands.filter((line) => line.includes('shutdown'))).toHaveLength(1);
    expect(commands.filter((line) => line.includes('erase'))).toHaveLength(1);
  });

  test('honors the shared retry count', () => {
    const result = runScript('ios_boot_simulator.sh', [], { BOOT_FAIL: 'always', RETRIES: '1' });
    expect(result.status).not.toBe(0);
    expect(
      read('commands.log')
        .split('\n')
        .filter((line) => line.includes('bootstatus')),
    ).toHaveLength(1);
    expect(read('commands.log')).not.toContain('erase');
  });

  test('honors the shared retry delay', () => {
    mockCommand('sleep', 'echo "sleep $*" >> commands.log');
    boot({ BOOT_FAIL: 'once', RETRY_DELAY: '7' });
    expect(read('commands.log')).toContain('sleep 7');
  });

  test('removes stale device selection when boot fails', () => {
    writeFileSync(join(root, '.simulator_udid'), 'stale');
    expect(runScript('ios_boot_simulator.sh', [], { BOOT_FAIL: 'always' }).status).not.toBe(0);
    expect(existsSync(join(root, '.simulator_udid'))).toBe(false);
  });

  test('fails before boot when the requested device is unavailable', () => {
    expect(runScript('ios_boot_simulator.sh', [], { IOS_DEVICE: 'missing' }).status).not.toBe(0);
    expect(read('commands.log')).not.toContain('bootstatus');
  });

  test('installs on the recorded device without launching the app', () => {
    boot();
    mkdirSync(join(root, 'Test.app'));
    expect(runScript('ios_install_app.sh', ['Test.app']).status).toBe(0);
    expect(read('commands.log')).toContain('simctl install test-udid Test.app');
    expect(read('commands.log')).not.toContain('launch');
  });

  test('fails after exhausting install attempts', () => {
    boot();
    mkdirSync(join(root, 'Test.app'));
    expect(
      runScript('ios_install_app.sh', ['Test.app'], { INSTALL_FAIL: 'always' }).status,
    ).not.toBe(0);
    expect(
      read('commands.log')
        .split('\n')
        .filter((line) => line.includes('simctl install')),
    ).toHaveLength(2);
  });

  test('retries Maestro on the same device and preserves attempt logs', () => {
    boot();
    expect(runScript('ios_run_e2e.sh', [], { TEST_FAIL: 'once' }).status).toBe(0);
    const commands = read('maestro-commands.log').split('\n');
    expect(commands).toHaveLength(2);
    expect(commands.every((line) => line.startsWith('--device test-udid test '))).toBe(true);
    expect(existsSync(join(root, 'e2e-artifacts/attempt-1/maestro.log'))).toBe(true);
    expect(read('e2e-artifacts/EXITCODE')).toBe('0');
  });

  test('reports Maestro failures after exhausting retries', () => {
    boot();
    expect(runScript('ios_run_e2e.sh', [], { TEST_FAIL: 'always' }).status).not.toBe(0);
    expect(read('e2e-artifacts/EXITCODE')).toBe('2');
  });

  test('resets Android app data between retries without reinstalling the APK', () => {
    mockCommand('adb', 'echo "$*" >> adb-commands.log');
    mockCommand('npm', 'if [ ! -f retried ]; then touch retried; exit 1; fi');
    writeFileSync(join(root, 'test.apk'), '');
    expect(runScript('android_run_e2e.sh', ['test.apk', 'com.example.app']).status).toBe(0);
    const commands = read('adb-commands.log').split('\n');
    expect(commands.filter((line) => line === 'install -r test.apk')).toHaveLength(1);
    expect(commands.filter((line) => line === 'shell pm clear com.example.app')).toHaveLength(1);
  });

  test('preserves command exit codes', () => {
    const helper = join(scripts, 'with_timeout.sh');
    expect(
      run(['bash', '-c', 'source "$1"; run_with_timeout 2 bash -c "exit 7"', '_', helper]).status,
    ).toBe(7);
  });

  test('terminates descendants even when they ignore TERM', async () => {
    const helper = join(scripts, 'with_timeout.sh');
    const child = `
      const fs = require('node:fs');
      process.on('SIGTERM', () => {});
      setTimeout(() => fs.writeFileSync('escaped', ''), 1500);
    `;
    const started = Date.now();
    const result = run([
      'bash',
      '-c',
      'source "$1"; run_with_timeout 0.2 bash -c \'"$1" -e "$2" & wait\' _ "$2" "$3"',
      '_',
      helper,
      process.execPath,
      child,
    ]);
    expect(result.status).toBe(124);
    expect(Date.now() - started).toBeLessThan(3000);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(existsSync(join(root, 'escaped'))).toBe(false);
  });
});
