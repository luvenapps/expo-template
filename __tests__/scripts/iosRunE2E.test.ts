const childProcess = require('node:child_process') as typeof import('node:child_process');
const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const path = require('node:path') as typeof import('node:path');
import { main as rawE2eMain, runE2E as rawRunE2E } from '../../.github/scripts/ios_run_e2e.mjs';

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

const runE2E = rawRunE2E as (options?: ScriptOptions) => number;
const e2eMain = rawE2eMain as (options?: ScriptOptions) => number;
const simulatorUdid = 'SIMULATOR-123';

describe('iOS E2E runner', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios e2e-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function io() {
    return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
  }

  test('iOS E2E targets the selected simulator, retries, and records its latest results', () => {
    fs.writeFileSync(path.join(root, '.simulator_udid'), simulatorUdid);
    const calls: CommandCall[] = [];
    const ioStream = io();
    expect(
      runE2E({
        root,
        env: { RETRIES: '2', RETRY_DELAY: '0' },
        io: ioStream,
        runCommand: (command, args, timeout) => {
          calls.push({ command, args, timeout });
          return { status: calls.length === 1 ? 1 : 0, stdout: 'maestro output', stderr: '' };
        },
        sleep: jest.fn(),
      }),
    ).toBe(0);
    expect(calls[0]).toMatchObject({
      command: 'maestro',
      timeout: 240,
    });
    expect(calls[0].args).toEqual([
      '--device',
      simulatorUdid,
      'test',
      '.maestro/flows/smoke.ios.yaml',
      '--test-output-dir',
      path.join(root, 'e2e-artifacts/attempt-1'),
    ]);
    expect(fs.readFileSync(path.join(root, 'e2e-artifacts/EXITCODE'), 'utf8')).toBe('0\n');
    expect(fs.readlinkSync(path.join(root, 'e2e-artifacts/latest'))).toBe('attempt-2');

    const outputFile = path.join(root, 'e2e-artifacts/latest');
    fs.rmSync(outputFile);
    fs.writeFileSync(outputFile, 'stale');
    const failing = runE2E({
      root,
      env: { RETRIES: '1', RETRY_DELAY: '0' },
      io: io(),
      runCommand: () => ({ status: 124, stderr: 'timed out' }),
    });
    expect(failing).toBe(124);
    expect(fs.readFileSync(path.join(root, 'e2e-artifacts/EXITCODE'), 'utf8')).toBe('124\n');
    expect(fs.existsSync(path.join(root, 'e2e-artifacts/latest'))).toBe(false);
  });

  test('standalone iOS E2E command loads the selected UDID and runs through the timeout helper', () => {
    const originalCwd = process.cwd();
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const originalEnvironment = {
      RETRIES: process.env.RETRIES,
      RETRY_DELAY: process.env.RETRY_DELAY,
    };
    const script = path.join(originalCwd, '.github/scripts/ios_run_e2e.mjs');
    const helper = path.join(root, '.github/scripts/with_timeout.mjs');
    fs.mkdirSync(path.dirname(helper), { recursive: true });
    fs.copyFileSync(path.join(originalCwd, '.github/scripts/with_timeout.mjs'), helper);
    fs.writeFileSync(path.join(root, '.simulator_udid'), simulatorUdid);

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
      delete process.env.RETRIES;
      process.env.RETRY_DELAY = '1';
      process.argv = [process.execPath, script];
      jest.resetModules();
      require(script);
      expect(process.exitCode).toBe(0);
      expect(fs.readlinkSync(path.join(root, 'e2e-artifacts/latest'))).toBe('attempt-2');
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('retrying in 1s'));
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

  test('reports iOS E2E setup errors and validates retry settings', () => {
    expect(() => runE2E({ root })).toThrow('UDID file is missing');
    fs.writeFileSync(path.join(root, '.simulator_udid'), '');
    expect(() => runE2E({ root })).toThrow('UDID file is empty');
    fs.writeFileSync(path.join(root, '.simulator_udid'), simulatorUdid);
    expect(() => runE2E({ root, env: { RETRIES: '0' } })).toThrow(
      'RETRIES must be a positive integer',
    );
    expect(() => runE2E({ root, env: { RETRY_DELAY: '-1' } })).toThrow(
      'RETRY_DELAY must be a non-negative integer',
    );
    const errors = io();
    expect(e2eMain({ root, env: {}, io: errors, runCommand: () => ({ status: 1 }) })).toBe(1);
    expect(
      e2eMain({ root, env: { RETRIES: '1' }, io: errors, runCommand: () => ({ status: 9 }) }),
    ).toBe(9);
    expect(e2eMain({ root: path.join(root, 'missing'), io: errors })).toBe(1);
  });
});
