const childProcess = require('node:child_process') as typeof import('node:child_process');
const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const path = require('node:path') as typeof import('node:path');
import {
  installApp as rawInstallApp,
  main as rawInstallMain,
} from '../../.github/scripts/ios_install_app.mjs';

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
type CommandCall = { command: string; args: string[]; timeout?: number };

const installApp = rawInstallApp as (
  appPath: string,
  options?: ScriptOptions,
) => { udid: string; bundleId: string };
const installMain = rawInstallMain as (argv?: string[], options?: ScriptOptions) => number;
const simulatorUdid = 'SIMULATOR-123';

describe('iOS app installation', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios app install-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function io() {
    return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
  }

  function appPath() {
    const app = path.join(root, 'BetterHabits.app');
    fs.mkdirSync(app);
    fs.writeFileSync(path.join(app, 'Info.plist'), 'fixture');
    return app;
  }

  test('installs on the recorded simulator and removes only an existing copy of the app', () => {
    fs.writeFileSync(path.join(root, '.simulator_udid'), simulatorUdid);
    const app = appPath();
    const calls: CommandCall[] = [];
    const runCommand: RunCommand = (command, args) => {
      calls.push({ command, args });
      if (command.endsWith('PlistBuddy'))
        return { status: 0, stdout: 'com.luvenapps.betterhabits\n' };
      if (args[1] === 'get_app_container') return { status: 0, stdout: '/installed.app' };
      return { status: 0, stdout: '' };
    };

    expect(installApp(app, { root, runCommand, io: io() })).toEqual({
      udid: simulatorUdid,
      bundleId: 'com.luvenapps.betterhabits',
    });
    expect(calls.map(({ args }) => args.slice(0, 3))).toEqual([
      ['-c', 'Print :CFBundleIdentifier', path.join(app, 'Info.plist')],
      ['simctl', 'get_app_container', simulatorUdid],
      ['simctl', 'uninstall', simulatorUdid],
      ['simctl', 'install', simulatorUdid],
    ]);
  });

  test('standalone install command uses the recorded simulator and retries with the timeout helper', () => {
    const originalCwd = process.cwd();
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const originalRetryDelay = process.env.RETRY_DELAY;
    const originalRetries = process.env.RETRIES;
    const script = path.join(originalCwd, '.github/scripts/ios_install_app.mjs');
    const app = path.join(root, 'Standalone.app');
    fs.mkdirSync(app);
    fs.writeFileSync(path.join(app, 'Info.plist'), 'fixture');
    fs.writeFileSync(path.join(root, '.simulator_udid'), simulatorUdid);
    fs.mkdirSync(path.join(root, '.github/scripts'), { recursive: true });
    fs.copyFileSync(
      path.join(originalCwd, '.github/scripts/with_timeout.mjs'),
      path.join(root, '.github/scripts/with_timeout.mjs'),
    );

    let installs = 0;
    const spawn = jest.spyOn(childProcess, 'spawnSync') as jest.SpyInstance;
    spawn.mockImplementation((command: string, args: readonly string[] = []) => {
      if (args[2] === '/usr/libexec/PlistBuddy') {
        return { status: 0, stdout: 'com.example.standalone\n', stderr: '' };
      }
      if (args[4] === 'get_app_container') return { status: 1, stdout: '', stderr: '' };
      if (args[4] === 'install')
        return { status: installs++ === 0 ? 1 : 0, stdout: '', stderr: '' };
      return { status: 0, stdout: '', stderr: '' };
    });
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      process.chdir(root);
      delete process.env.RETRIES;
      process.env.RETRY_DELAY = '1';
      process.argv = [process.execPath, script, 'Standalone.app'];
      jest.resetModules();
      require(script);
      expect(process.exitCode).toBe(0);
      expect(installs).toBe(2);
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('retrying in 1s'));
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining([
          fs.realpathSync(path.join(root, '.github/scripts/with_timeout.mjs')),
        ]),
        expect.objectContaining({ cwd: fs.realpathSync(root), encoding: 'utf8' }),
      );
    } finally {
      process.chdir(originalCwd);
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      if (originalRetryDelay === undefined) delete process.env.RETRY_DELAY;
      else process.env.RETRY_DELAY = originalRetryDelay;
      if (originalRetries === undefined) delete process.env.RETRIES;
      else process.env.RETRIES = originalRetries;
      spawn.mockRestore();
      stdout.mockRestore();
      stderr.mockRestore();
      jest.resetModules();
    }
  });

  test('reports missing app or simulator state and retries uninstall and install failures', () => {
    const app = appPath();
    expect(() => installApp('', { root })).toThrow('App path required');
    expect(() => installApp(path.join(root, 'missing.app'), { root })).toThrow('App not found');
    expect(() => installApp(app, { root })).toThrow('UDID file is missing');
    fs.writeFileSync(path.join(root, '.simulator_udid'), '  ');
    expect(() => installApp(app, { root })).toThrow('UDID file is empty');
    fs.writeFileSync(path.join(root, '.simulator_udid'), simulatorUdid);

    let existingChecks = 0;
    const sleep = jest.fn();
    const runCommand: RunCommand = (command, args) => {
      if (command.endsWith('PlistBuddy')) return { status: 0, stdout: 'com.example.app' };
      if (args[1] === 'get_app_container') return { status: existingChecks++ === 0 ? 0 : 1 };
      if (args[1] === 'uninstall') return { status: 1, stderr: 'uninstall failed' };
      if (args[1] === 'install') return { status: 0, stderr: 'install attempt' };
      return { status: 0 };
    };
    expect(
      installApp(app, {
        root,
        env: { RETRIES: '2', RETRY_DELAY: '0' },
        runCommand,
        sleep,
        io: io(),
      }),
    ).toMatchObject({ bundleId: 'com.example.app' });
    expect(sleep).toHaveBeenCalledWith(0);

    let installAttempt = 0;
    expect(
      installApp(app, {
        root,
        env: { RETRIES: '2', RETRY_DELAY: '0' },
        runCommand: (command, args) =>
          command.endsWith('PlistBuddy')
            ? { status: 0, stdout: 'com.example.app' }
            : args[1] === 'install'
              ? { status: installAttempt++ === 0 ? 1 : 0 }
              : { status: 1 },
        sleep: jest.fn(),
        io: io(),
      }),
    ).toMatchObject({ bundleId: 'com.example.app' });

    expect(() =>
      installApp(app, {
        root,
        env: { RETRIES: '1' },
        runCommand: (command, args) =>
          command.endsWith('PlistBuddy')
            ? { status: 1, stderr: 'plist error' }
            : { status: 0, stdout: '' },
        io: io(),
      }),
    ).toThrow('Unable to read bundle identifier');
    expect(() =>
      installApp(app, {
        root,
        env: { RETRIES: '1' },
        runCommand: (command, args) =>
          command.endsWith('PlistBuddy')
            ? { status: 0, stdout: 'com.example.app' }
            : args[1] === 'install'
              ? { status: 7, stderr: 'install failed' }
              : { status: 1 },
        io: io(),
      }),
    ).toThrow('Could not install com.example.app after 1 attempts');
  });

  test('CLI wrapper returns a clear usage error', () => {
    const errors = io();
    expect(installMain([], { root, io: errors })).toBe(1);
  });
});
