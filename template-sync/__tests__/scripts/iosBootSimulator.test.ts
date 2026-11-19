const childProcess = require('node:child_process') as typeof import('node:child_process');
const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const path = require('node:path') as typeof import('node:path');
import {
  bootSimulator as rawBootSimulator,
  main as rawBootMain,
} from '../../.github/scripts/ios_boot_simulator.mjs';

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

const bootSimulator = rawBootSimulator as (options?: ScriptOptions) => string;
const bootMain = rawBootMain as (options?: ScriptOptions) => number;
const simulatorUdid = 'SIMULATOR-123';
const simulatorList = JSON.stringify({
  devices: { runtime: [{ name: 'iPhone 17', udid: simulatorUdid, state: 'Shutdown' }] },
});

describe('iOS simulator boot', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios simulator boot-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function io() {
    return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
  }

  test('boots only the requested available simulator and saves its UDID', () => {
    fs.writeFileSync(path.join(root, '.simulator_udid'), 'stale');
    const calls: CommandCall[] = [];
    const runCommand: RunCommand = (command, args, timeout) => {
      calls.push({ command, args, timeout });
      if (args.includes('--json')) return { status: 0, stdout: simulatorList, stderr: '' };
      return { status: 0, stdout: args[1] === 'boot' ? 'boot accepted' : '', stderr: '' };
    };

    expect(
      bootSimulator({
        root,
        env: { IOS_DEVICE: 'iPhone 17', RETRY_DELAY: '0' },
        runCommand,
        io: io(),
      }),
    ).toBe(simulatorUdid);
    expect(fs.readFileSync(path.join(root, '.simulator_udid'), 'utf8')).toBe(`${simulatorUdid}\n`);
    expect(calls.map(({ args }) => args.slice(0, 3))).toEqual([
      ['simctl', 'list', 'devices'],
      ['simctl', 'shutdown', simulatorUdid],
      ['simctl', 'boot', simulatorUdid],
      ['simctl', 'bootstatus', simulatorUdid],
    ]);
  });

  test('reports missing configuration, failed device listing, invalid JSON, and no exact device', () => {
    const defaultOptions = { root, env: { IOS_DEVICE: 'iPhone 17' }, io: io() };
    expect(() => bootSimulator({ ...defaultOptions, env: {} })).toThrow('IOS_DEVICE is required');
    expect(() =>
      bootSimulator({
        ...defaultOptions,
        runCommand: () => ({ status: 1, stderr: 'xcrun failed' }),
      }),
    ).toThrow('Unable to list available iOS simulators');
    expect(() =>
      bootSimulator({ ...defaultOptions, runCommand: () => ({ status: 0, stdout: 'invalid' }) }),
    ).toThrow('invalid simulator device JSON');
    expect(() =>
      bootSimulator({
        ...defaultOptions,
        env: { IOS_DEVICE: 'iPhone 17', RETRIES: '1', RETRY_DELAY: '0' },
        runCommand: () => ({
          status: 0,
          stdout: JSON.stringify({
            devices: {
              runtime: [
                { name: 'Unavailable', udid: 'SIM-0', isAvailable: false },
                { name: 'iPhone 16', udid: 'SIM-16', isAvailable: true },
              ],
            },
          }),
        }),
      }),
    ).toThrow('Available iPhones: iPhone 16');
    const errorOutput = io();
    expect(() =>
      bootSimulator({
        ...defaultOptions,
        env: { IOS_DEVICE: 'iPhone 17', RETRIES: '1', RETRY_DELAY: '0' },
        io: errorOutput,
        runCommand: (command, args) =>
          args.includes('--json')
            ? { status: 0, stdout: simulatorList }
            : { status: 1, error: new Error('runner error') },
      }),
    ).toThrow('Could not boot');
    expect(errorOutput.stderr.write).toHaveBeenCalledWith('runner error\n');
  });

  test('retries simulator boot with the configured delay and fails after bounded attempts', () => {
    const statuses = [0, 0, 1, 0, 0, 0, 0];
    const sleep = jest.fn();
    const runCommand: RunCommand = (command, args) => {
      if (args.includes('--json')) return { status: 0, stdout: simulatorList };
      return { status: statuses.shift(), stdout: '', stderr: '' };
    };
    expect(
      bootSimulator({
        root,
        env: { IOS_DEVICE: 'iPhone 17', RETRIES: '2', RETRY_DELAY: '3' },
        runCommand,
        sleep,
        io: io(),
      }),
    ).toBe(simulatorUdid);
    expect(sleep).toHaveBeenCalledWith(3);

    const failed: RunCommand = (command, args) =>
      args.includes('--json')
        ? { status: 0, stdout: simulatorList }
        : { status: 1, stderr: 'boot failed' };
    expect(() =>
      bootSimulator({
        root,
        env: { IOS_DEVICE: 'iPhone 17', RETRIES: '1', RETRY_DELAY: '0' },
        runCommand: failed,
        io: io(),
      }),
    ).toThrow('after 1 attempts');
    expect(() =>
      bootSimulator({ root, env: { IOS_DEVICE: 'iPhone 17', RETRIES: '0' }, runCommand, io: io() }),
    ).toThrow('RETRIES must be a positive integer');
  });

  test('CLI wrappers return success or a clear failure code', () => {
    const successIo = io();
    expect(
      bootMain({
        root,
        env: { IOS_DEVICE: 'iPhone 17', RETRY_DELAY: '0' },
        io: successIo,
        runCommand: (command, args) =>
          args.includes('--json') ? { status: 0, stdout: simulatorList } : { status: 0 },
      }),
    ).toBe(0);
    const errorIo = io();
    expect(bootMain({ root, env: {}, io: errorIo })).toBe(1);
    expect(errorIo.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('IOS_DEVICE is required'),
    );
  });

  test('standalone boot command uses mise environment defaults and retries through the timeout helper', () => {
    const originalCwd = process.cwd();
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const originalEnvironment = {
      IOS_DEVICE: process.env.IOS_DEVICE,
      RETRIES: process.env.RETRIES,
      RETRY_DELAY: process.env.RETRY_DELAY,
    };
    const script = path.join(originalCwd, '.github/scripts/ios_boot_simulator.mjs');
    const helper = path.join(originalCwd, '.github/scripts/with_timeout.mjs');

    let bootAttempts = 0;
    const spawn = jest.spyOn(childProcess, 'spawnSync') as jest.SpyInstance;
    spawn.mockImplementation((command: string, args: readonly string[] = []) => {
      const subcommand = args[4];
      if (args.includes('--json')) return { status: 0, stdout: simulatorList, stderr: '' };
      if (subcommand === 'boot' && bootAttempts++ === 0)
        return { status: 1, stdout: '', stderr: '' };
      return { status: 0, stdout: '', stderr: '' };
    });
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      process.chdir(root);
      process.env.IOS_DEVICE = 'iPhone 17';
      process.env.RETRIES = '2';
      process.env.RETRY_DELAY = '1';
      process.argv = [process.execPath, script];
      jest.resetModules();
      require(script);
      expect(process.exitCode).toBe(0);
      expect(spawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining([fs.realpathSync(helper), '30', 'xcrun']),
        expect.objectContaining({ cwd: fs.realpathSync(root), encoding: 'utf8' }),
      );
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('retrying in 1s'));
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
});
