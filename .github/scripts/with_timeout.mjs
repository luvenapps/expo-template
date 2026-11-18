#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { constants as osConstants } from 'node:os';
import process from 'node:process';

function childExitCode(code, signal) {
  if (code !== null) return code;
  const signalNumber = signal ? osConstants.signals[signal] : undefined;
  return typeof signalNumber === 'number' ? (128 + signalNumber) % 256 : 1;
}

export function runWithTimeout(command, args, timeoutSeconds, options = {}) {
  const io = options.io ?? process;
  const platform = options.platform ?? process.platform;
  const spawnProcess = options.spawnProcess ?? spawn;

  return new Promise((resolve) => {
    const child = spawnProcess(command, args, {
      stdio: 'inherit',
      detached: platform !== 'win32',
    });
    const processId = child.pid;
    let timeoutTimer;
    let killTimer;
    let timedOut = false;
    let killCompleted = false;
    let result;
    let settled = false;

    const signalProcessGroup = (signal) => {
      if (!processId) return;
      try {
        process.kill(platform === 'win32' ? processId : -processId, signal);
      } catch (error) {
        if (error.code !== 'ESRCH') {
          try {
            child.kill(signal);
          } catch {}
        }
      }
    };

    const finish = () => {
      if (settled || result === undefined || (timedOut && !killCompleted))
        return;
      settled = true;
      resolve(timedOut ? 124 : result);
    };

    const killProcessGroup = () => {
      clearTimeout(killTimer);
      signalProcessGroup('SIGKILL');
      killCompleted = true;
      finish();
    };

    child.once('error', () => {
      result = 1;
      clearTimeout(timeoutTimer);
      finish();
    });

    child.once('close', (code, signal) => {
      if (!timedOut) clearTimeout(timeoutTimer);
      result = childExitCode(code, signal);
      if (timedOut && !killCompleted) killProcessGroup();
      finish();
    });

    timeoutTimer = setTimeout(() => {
      timedOut = true;
      io.stderr.write(
        `Command timed out after ${timeoutSeconds}s: ${command}\n`,
      );
      signalProcessGroup('SIGTERM');
      killTimer = setTimeout(killProcessGroup, 1000);
    }, timeoutSeconds * 1000);
  });
}

export async function main(argv = process.argv.slice(2), io = process) {
  if (argv.length < 2) {
    io.stderr.write('Usage: with_timeout.mjs <seconds> <command> [args...]\n');
    return 2;
  }

  const timeoutSeconds = Number(argv[0]);
  const [command, ...args] = argv.slice(1);
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0 || !command) {
    io.stderr.write('Timeout must be positive and a command is required\n');
    return 2;
  }

  return runWithTimeout(command, args, timeoutSeconds, { io });
}

if (
  process.argv[1]
    ?.replaceAll('\\', '/')
    .endsWith('/.github/scripts/with_timeout.mjs')
) {
  main().then((code) => {
    process.exitCode = code;
  });
}
