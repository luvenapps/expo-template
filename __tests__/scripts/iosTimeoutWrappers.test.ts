const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const path = require('node:path') as typeof import('node:path');
const { EventEmitter } = require('node:events') as typeof import('node:events');
import {
  main as timeoutMain,
  parseArguments,
  runWithTimeout as helperRunWithTimeout,
} from '../../.github/scripts/with_timeout.mjs';
import { runWithTimeout as rawBootWithTimeout } from '../../.github/scripts/ios_boot_simulator.mjs';
import { runWithTimeout as rawInstallWithTimeout } from '../../.github/scripts/ios_install_app.mjs';
import { runWithTimeout as rawE2eWithTimeout } from '../../.github/scripts/ios_run_e2e.mjs';

type CommandResult = { status?: number | null; stdout?: string; stderr?: string; error?: Error };
type RunWithTimeout = (
  root: string,
  command: string,
  args: string[],
  seconds: number,
) => CommandResult;

const bootWithTimeout = rawBootWithTimeout as RunWithTimeout;
const installWithTimeout = rawInstallWithTimeout as RunWithTimeout;
const e2eWithTimeout = rawE2eWithTimeout as RunWithTimeout;

describe('iOS command timeout wrappers', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios timeout wrappers-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('timeout wrappers preserve command exits and stop a timed out process tree', async () => {
    expect(
      bootWithTimeout(process.cwd(), process.execPath, ['-e', 'process.exit(7)'], 5).status,
    ).toBe(7);
    expect(
      installWithTimeout(process.cwd(), process.execPath, ['-e', 'process.exit(8)'], 5).status,
    ).toBe(8);
    expect(
      e2eWithTimeout(process.cwd(), process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], 0.1)
        .status,
    ).toBe(124);

    const marker = path.join(root, 'surviving-child');
    const childScript = `const fs = require('node:fs'); process.on('SIGTERM', () => {}); setTimeout(() => fs.writeFileSync(${JSON.stringify(marker)}, 'survived'), 1500);`;
    const parentScript = `const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', ${JSON.stringify(childScript)}], { stdio: 'ignore' }); setTimeout(() => {}, 10000);`;
    expect(e2eWithTimeout(process.cwd(), process.execPath, ['-e', parentScript], 0.1).status).toBe(
      124,
    );
    await new Promise((resolve) => setTimeout(resolve, 1700));
    expect(fs.existsSync(marker)).toBe(false);
  });

  test('validates timeout arguments and returns the wrapped command status', async () => {
    const io = { stderr: { write: jest.fn() }, stdout: { write: jest.fn() } };
    expect(parseArguments([], io as never)).toBeNull();
    expect(parseArguments(['invalid', process.execPath], io as never)).toBeNull();
    expect(parseArguments(['0', process.execPath], io as never)).toBeNull();
    expect(io.stderr.write).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(io.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Timeout must be a number'),
    );
    expect(io.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Timeout must be positive'),
    );
    await expect(
      timeoutMain(['5', process.execPath, '-e', 'process.exit(9)'], io as never),
    ).resolves.toBe(9);
  });

  test('reports spawn failures and translates signal exits like the previous helper', async () => {
    const io = { stderr: { write: jest.fn() }, stdout: { write: jest.fn() } };
    await expect(timeoutMain(['5', 'command-that-does-not-exist'], io as never)).resolves.toBe(1);
    await expect(
      timeoutMain(
        ['5', process.execPath, '-e', "process.kill(process.pid, 'SIGTERM')"],
        io as never,
      ),
    ).resolves.toBe(241);
  });

  test('kills timed out child processes and handles missing or invalid child PIDs', async () => {
    const io = { stderr: { write: jest.fn() }, stdout: { write: jest.fn() } };
    await expect(
      helperRunWithTimeout(process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], 0.05, { io }),
    ).resolves.toBe(124);

    const child = new EventEmitter() as InstanceType<typeof EventEmitter> & {
      pid?: number | string;
      kill: jest.Mock;
    };
    child.pid = 'not-a-pid';
    child.kill = jest.fn(() => setTimeout(() => child.emit('close', null, 'UNKNOWN_SIGNAL'), 0));
    await expect(
      helperRunWithTimeout('fake-command', [], 0.01, {
        io,
        platform: 'win32',
        spawnProcess: () => child,
      }),
    ).resolves.toBe(124);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');

    const missingPidChild = new EventEmitter() as InstanceType<typeof EventEmitter> & {
      pid?: number;
      kill: jest.Mock;
    };
    missingPidChild.kill = jest.fn();
    setTimeout(() => missingPidChild.emit('close', null, 'UNKNOWN_SIGNAL'), 20);
    await expect(
      helperRunWithTimeout('fake-command', [], 0.01, {
        io,
        platform: 'win32',
        spawnProcess: () => missingPidChild,
      }),
    ).resolves.toBe(124);
    expect(missingPidChild.kill).not.toHaveBeenCalled();
  });

  test('uses default parser inputs and maps unknown child signals to exit code one', async () => {
    expect(parseArguments([])).toBeNull();
    await expect(timeoutMain([], undefined as never)).resolves.toBe(2);
    const child = new EventEmitter() as InstanceType<typeof EventEmitter> & {
      pid?: number;
    };
    setTimeout(() => child.emit('close', null, 'UNKNOWN_SIGNAL'), 0);
    await expect(
      helperRunWithTimeout('fake-command', [], 5, {
        spawnProcess: () => child,
      }),
    ).resolves.toBe(1);
  });
});
