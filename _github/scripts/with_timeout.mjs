#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { constants as osConstants } from 'node:os';
import process from 'node:process';

function printError(message, io) {
  io.stderr.write(`${message}\n`);
}

function childExitCode(code, signal) {
  if (code !== null) return code;
  const signalNumber = signal ? osConstants.signals[signal] : undefined;
  return typeof signalNumber === 'number' ? (256 - signalNumber) % 256 : 1;
}

export function parseArguments(argv, io = process) {
  if (argv.length < 2) {
    printError('Usage: with_timeout.mjs <seconds> <command> [args...]', io);
    return null;
  }

  const timeoutSeconds = Number(argv[0]);
  if (Number.isNaN(timeoutSeconds)) {
    printError('Timeout must be a number of seconds', io);
    return null;
  }

  const [command, ...args] = argv.slice(1);
  if (timeoutSeconds <= 0 || !command) {
    printError('Timeout must be positive and a command is required', io);
    return null;
  }

  return { timeoutSeconds, command, args };
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

    const killProcessGroup = () => {
      clearTimeout(killTimer);
      signalProcessGroup('SIGKILL');
      killCompleted = true;
      finish();
    };

    const finish = () => {
      if (settled || result === undefined || (timedOut && !killCompleted)) return;
      settled = true;
      resolve(timedOut ? 124 : result);
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
      printError(`Command timed out after ${timeoutSeconds}s: ${[command, ...args].join(' ')}`, io);
      signalProcessGroup('SIGTERM');
      killTimer = setTimeout(killProcessGroup, 1000);
    }, timeoutSeconds * 1000);
  });
}

export async function main(argv = process.argv.slice(2), io = process) {
  const parsed = parseArguments(argv, io);
  if (!parsed) return 2;
  return runWithTimeout(parsed.command, parsed.args, parsed.timeoutSeconds, { io });
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/.github/scripts/with_timeout.mjs')) {
  main().then((code) => {
    process.exitCode = code;
  });
}
