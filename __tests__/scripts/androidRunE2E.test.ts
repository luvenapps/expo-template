const childProcess = require('node:child_process') as typeof import('node:child_process');
const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const path = require('node:path') as typeof import('node:path');
import {
  main as rawMain,
  runAndroidE2E as rawRunAndroidE2E,
  runWithTimeout as rawRunWithTimeout,
} from '../../.github/scripts/android_run_e2e.mjs';

type CommandResult = { status?: number | null; stdout?: string; stderr?: string; error?: Error };
type TestIO = {
  stdout: { write: (text: string) => unknown };
  stderr: { write: (text: string) => unknown };
};
type RunCommand = (command: string, args: string[], timeout?: number) => CommandResult;
type ScriptOptions = {
  root?: string;
  env?: Record<string, string | undefined>;
  io?: TestIO;
  runCommand?: RunCommand;
  sleep?: (seconds: number) => void;
};

const main = rawMain as (argv?: string[], options?: ScriptOptions) => number;
const runAndroidE2E = rawRunAndroidE2E as (
  apkPath: string,
  packageName: string,
  options?: ScriptOptions,
) => number;
const runWithTimeout = rawRunWithTimeout as (
  root: string,
  command: string,
  args: string[],
  seconds: number,
) => CommandResult;

describe('Android E2E runner', () => {
  let root: string;
  let apk: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'android e2e-'));
    apk = path.join(root, 'app.apk');
    fs.writeFileSync(apk, 'fixture apk');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function io() {
    return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
  }

  test('installs once and runs Maestro using the emulator runner ready state', () => {
    const calls: { command: string; args: string[]; timeout?: number }[] = [];
    const result = runAndroidE2E(apk, 'com.example.app', {
      root,
      env: { RETRIES: '2' },
      io: io(),
      runCommand: (command, args, timeout) => {
        calls.push({ command, args, timeout });
        return { status: 0, stdout: '', stderr: '' };
      },
    });

    expect(result).toBe(0);
    expect(calls).toEqual([
      { command: 'adb', args: ['install', '-r', apk], timeout: 120 },
      {
        command: 'maestro',
        args: [
          'test',
          '.maestro/flows/smoke.android.yaml',
          '--test-output-dir',
          path.join(root, 'e2e-artifacts/attempt-1'),
        ],
        timeout: 240,
      },
    ]);
    expect(fs.readFileSync(path.join(root, 'e2e-artifacts/EXITCODE'), 'utf8')).toBe('0\n');
    expect(fs.readlinkSync(path.join(root, 'e2e-artifacts/latest'))).toBe('attempt-1');
  });

  test('clears app data after a failed attempt and retries without reinstalling', () => {
    const calls: { command: string; args: string[] }[] = [];
    const sleep = jest.fn();
    let maestroAttempts = 0;
    const runCommand: RunCommand = (command, args) => {
      calls.push({ command, args });
      if (command === 'maestro') return { status: ++maestroAttempts === 1 ? 2 : 0 };
      return { status: 0 };
    };

    expect(
      runAndroidE2E(apk, 'com.example.app', {
        root,
        env: { RETRIES: '2', RETRY_DELAY: '0' },
        runCommand,
        sleep,
        io: io(),
      }),
    ).toBe(0);
    expect(
      calls.filter(({ command, args }) => command === 'adb' && args[0] === 'install'),
    ).toHaveLength(1);
    expect(calls).toContainEqual({
      command: 'adb',
      args: ['shell', 'pm', 'clear', 'com.example.app'],
    });
    expect(sleep).toHaveBeenCalledWith(0);
    expect(fs.readlinkSync(path.join(root, 'e2e-artifacts/latest'))).toBe('attempt-2');
  });

  test('reinstalls after data clear fails and records reinstall errors', () => {
    const calls: { command: string; args: string[] }[] = [];
    let maestroAttempts = 0;
    const runCommand: RunCommand = (command, args) => {
      calls.push({ command, args });
      if (command === 'maestro') return { status: ++maestroAttempts === 1 ? 1 : 0 };
      if (args[0] === 'shell') return { status: 1, stderr: 'clear failed' };
      return { status: 0 };
    };
    expect(
      runAndroidE2E(apk, 'com.example.app', {
        root,
        env: { RETRIES: '2', RETRY_DELAY: '0' },
        runCommand,
        sleep: jest.fn(),
        io: io(),
      }),
    ).toBe(0);
    expect(
      calls.filter(({ command, args }) => command === 'adb' && args[0] === 'install'),
    ).toHaveLength(2);

    let testAttempt = 0;
    let installCalls = 0;
    const failingReinstall: RunCommand = (command, args) => {
      if (command === 'maestro') return { status: ++testAttempt === 1 ? 1 : 0 };
      if (args[0] === 'shell') return { status: 1, stderr: 'clear failed' };
      if (args[0] === 'install')
        return { status: installCalls++ === 0 ? 0 : 9, stderr: 'reinstall failed' };
      return { status: 0 };
    };
    expect(() =>
      runAndroidE2E(apk, 'com.example.app', {
        root,
        env: { RETRIES: '2' },
        runCommand: failingReinstall,
        io: io(),
      }),
    ).toThrow('Unable to reinstall com.example.app');
    expect(fs.readFileSync(path.join(root, 'e2e-artifacts/EXITCODE'), 'utf8')).toBe('9\n');
  });

  test('reports invalid inputs, failed initial installs, retries, and final Maestro exit codes', () => {
    expect(() => runAndroidE2E('', 'com.example.app', { root })).toThrow('APK path required');
    expect(() => runAndroidE2E(apk, '', { root })).toThrow('Package name required');
    expect(() =>
      runAndroidE2E(path.join(root, 'missing.apk'), 'com.example.app', { root }),
    ).toThrow('APK not found');
    expect(() => runAndroidE2E(apk, 'com.example.app', { root, env: { RETRIES: '0' } })).toThrow(
      'RETRIES must be a positive integer',
    );
    expect(() =>
      runAndroidE2E(apk, 'com.example.app', { root, env: { RETRY_DELAY: '-1' } }),
    ).toThrow('RETRY_DELAY must be a non-negative integer');

    const installFailure = io();
    expect(() =>
      runAndroidE2E(apk, 'com.example.app', {
        root,
        runCommand: () => ({ status: 5, error: new Error('adb missing') }),
        io: installFailure,
      }),
    ).toThrow('Unable to install com.example.app');
    expect(installFailure.stderr.write).toHaveBeenCalledWith('adb missing\n');
    expect(fs.readFileSync(path.join(root, 'e2e-artifacts/EXITCODE'), 'utf8')).toBe('5\n');

    const failedRun = runAndroidE2E(apk, 'com.example.app', {
      root,
      env: { RETRIES: '1' },
      runCommand: (command) => ({ status: command === 'adb' ? 0 : 124, stderr: 'timed out' }),
      io: io(),
    });
    expect(failedRun).toBe(124);
    expect(fs.readFileSync(path.join(root, 'e2e-artifacts/EXITCODE'), 'utf8')).toBe('124\n');
  });

  test('CLI wrapper returns the command exit code and a clear usage error', () => {
    const errors = io();
    expect(main([], { root, io: errors })).toBe(1);
    expect(errors.stderr.write).toHaveBeenCalledWith(expect.stringContaining('APK path required'));
    expect(
      main([apk, 'com.example.app'], {
        root,
        io: io(),
        env: { RETRIES: '1' },
        runCommand: (command) => ({ status: command === 'adb' ? 0 : 6 }),
      }),
    ).toBe(6);
  });

  test('standalone Android E2E command boots from the runner state and retries through the timeout helper', () => {
    const originalCwd = process.cwd();
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const originalEnvironment = {
      RETRIES: process.env.RETRIES,
      RETRY_DELAY: process.env.RETRY_DELAY,
    };
    const script = path.join(originalCwd, '.github/scripts/android_run_e2e.mjs');
    const helper = path.join(root, '.github/scripts/with_timeout.mjs');
    fs.mkdirSync(path.dirname(helper), { recursive: true });
    fs.copyFileSync(path.join(originalCwd, '.github/scripts/with_timeout.mjs'), helper);

    let maestroRuns = 0;
    const spawn = jest.spyOn(childProcess, 'spawnSync') as jest.SpyInstance;
    spawn.mockImplementation((command: string, args: readonly string[] = []) => {
      if (args[2] === 'maestro')
        return { status: maestroRuns++ === 0 ? 1 : 0, stdout: '', stderr: '' };
      return { status: 0, stdout: '', stderr: '' };
    });
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      process.chdir(root);
      process.env.RETRIES = '2';
      process.env.RETRY_DELAY = '1';
      process.argv = [process.execPath, script, 'app.apk', 'com.example.app'];
      jest.resetModules();
      require(script);
      expect(process.exitCode).toBe(0);
      expect(fs.readlinkSync(path.join(root, 'e2e-artifacts/latest'))).toBe('attempt-2');
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining('clearing app data before retry'),
      );
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining([fs.realpathSync(helper), '240', 'maestro']),
        expect.objectContaining({ cwd: fs.realpathSync(root), encoding: 'utf8' }),
      );
    } finally {
      process.chdir(originalCwd);
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      for (const [key, value] of Object.entries(originalEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      spawn.mockRestore();
      stdout.mockRestore();
      stderr.mockRestore();
      jest.resetModules();
    }
  });

  test('timeout wrapper preserves command exit status', () => {
    expect(
      runWithTimeout(process.cwd(), process.execPath, ['-e', 'process.exit(6)'], 5).status,
    ).toBe(6);
  });
});
