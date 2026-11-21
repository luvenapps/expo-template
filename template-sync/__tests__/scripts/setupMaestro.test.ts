import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import {
  main as rawMain,
  setupMaestro as rawSetupMaestro,
} from '../../.github/scripts/setup_maestro.mjs';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

type CommandResult = {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error & { code?: string };
};
type TestIO = {
  stdout: { write: (text: string) => unknown };
  stderr: { write: (text: string) => unknown };
};
type RunCommand = (
  command: string,
  args: string[],
  options: Record<string, unknown>,
) => CommandResult;
type Options = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  io?: TestIO;
  runCommand?: RunCommand;
  appendFile?: (path: string, content: string) => void;
};

const setupMaestro = rawSetupMaestro as (argv?: string[], options?: Options) => number;
const main = rawMain as (argv?: string[], options?: Options) => number;

function io(): TestIO {
  return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
}

describe('Maestro setup', () => {
  const context = useCiScriptTestContext();

  test('reports an already installed Maestro CLI without downloading', () => {
    context.mockCommand('maestro', 'echo "Maestro CLI 2.0.6"');
    const result = context.runScript('setup_maestro.mjs', ['2.0.6']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Maestro already installed: Maestro CLI 2.0.6');
  });

  test('uses process defaults when Maestro is already installed', () => {
    context.mockCommand('maestro', 'echo "Maestro 2.0.6"');
    const previousArgv = process.argv;
    const previousPath = process.env.PATH;
    const previousHome = process.env.HOME;
    process.argv = [process.execPath, 'setup_maestro.mjs'];
    process.env.PATH = context.bin;
    process.env.HOME = context.home;

    try {
      expect(setupMaestro()).toBe(0);
    } finally {
      process.argv = previousArgv;
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
    }
  });

  test('installs through curl, adds the local binary path, and verifies Maestro', () => {
    context.mockCommand('curl', 'printf "installer payload"');
    const env = { ...context.env, PATH: context.bin };
    const output = io();
    const runCommand: RunCommand = (command, args, options) => {
      if (command === 'curl') {
        expect(args).toEqual(['-fsSL', 'https://get.maestro.mobile.dev']);
        return { status: 0, stdout: 'installer payload' };
      }
      if (command === 'bash') {
        expect(options.input).toBe('installer payload');
        expect((options.env as NodeJS.ProcessEnv).MAESTRO_VERSION).toBe('2.0.6');
        const maestroBin = join(context.home, '.maestro/bin');
        mkdirSync(maestroBin, { recursive: true });
        writeFileSync(join(maestroBin, 'maestro'), '#!/bin/sh\necho Maestro 2.0.6\n', {
          mode: 0o755,
        });
        return {
          status: 0,
          stdout: 'installer output\n',
          stderr: 'installer warning\n',
          error: new Error('non-fatal installer error'),
        };
      }
      if (command === 'maestro') return { status: 0, stdout: 'Maestro 2.0.6\n' };
      throw new Error(`Unexpected command: ${command}`);
    };

    expect(setupMaestro(['2.0.6'], { cwd: context.root, env, io: output, runCommand })).toBe(0);
    expect(context.read('github-path.txt')).toBe(`${context.home}/.maestro/bin`);
    expect(output.stdout.write).toHaveBeenCalledWith('installer output\n');
    expect(output.stderr.write).toHaveBeenCalledWith('installer warning\n');
    expect(output.stderr.write).toHaveBeenCalledWith('non-fatal installer error\n');
    expect(output.stdout.write).toHaveBeenCalledWith(
      '✅ Maestro installed successfully: Maestro 2.0.6\n',
    );
  });

  test('returns clear failures when no downloader exists or installation fails', () => {
    const noDownloader = { ...context.env, PATH: context.bin };
    const missing = io();
    expect(
      setupMaestro([], { env: noDownloader, io: missing, runCommand: () => ({ status: 0 }) }),
    ).toBe(1);
    expect(missing.stderr.write).toHaveBeenCalledWith(
      '❌ curl or wget required to install Maestro\n',
    );

    context.mockCommand('wget', 'printf installer');
    const failed = io();
    expect(
      setupMaestro(['2.0.6'], {
        cwd: context.root,
        env: { ...context.env, PATH: context.bin },
        io: failed,
        runCommand: (command) =>
          command === 'wget'
            ? { status: 0, stdout: 'installer' }
            : { status: 7, stderr: 'install failed' },
      }),
    ).toBe(7);
    expect(failed.stderr.write).toHaveBeenCalledWith('install failed');
  });

  test('preserves the installed-command success behavior and catches thrown errors', () => {
    context.mockCommand('maestro', 'exit 1');
    const output = io();
    expect(
      setupMaestro([], {
        cwd: context.root,
        env: context.env,
        io: output,
        runCommand: () => ({ status: 9, stdout: '', stderr: 'version failed' }),
      }),
    ).toBe(0);
    expect(output.stderr.write).toHaveBeenCalledWith('version failed');

    expect(
      main([], {
        io: output,
        runCommand: () => {
          throw new Error('spawn failed');
        },
      }),
    ).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('spawn failed\n');
  });

  test('returns downloader failures, supports wget without GITHUB_PATH, and reports missing Maestro', () => {
    context.mockCommand('curl', 'printf payload');
    const downloadFailure = io();
    expect(
      setupMaestro(['2.0.6'], {
        cwd: context.root,
        env: { ...context.env, PATH: context.bin },
        io: downloadFailure,
        runCommand: (command) =>
          command === 'curl'
            ? {
                status: null,
                error: Object.assign(new Error('curl failed'), { code: 'ENOENT' }),
              }
            : { status: 0 },
      }),
    ).toBe(127);

    expect(
      setupMaestro(['2.0.6'], {
        cwd: context.root,
        env: { ...context.env, PATH: context.bin },
        io: io(),
        runCommand: (command) =>
          command === 'curl'
            ? { status: null, error: Object.assign(new Error('curl error'), { code: 'EIO' }) }
            : { status: 0 },
      }),
    ).toBe(1);

    unlinkSync(join(context.bin, 'curl'));
    context.mockCommand('wget', 'printf payload');
    const installFailure = io();
    expect(
      setupMaestro(['2.0.6'], {
        cwd: context.root,
        env: {
          ...context.env,
          HOME: join(context.root, 'maestro-home'),
          PATH: context.bin,
          GITHUB_PATH: '',
        },
        io: installFailure,
        runCommand: (command) => {
          if (command === 'wget') return { status: 0, stdout: 'payload' };
          if (command === 'bash') {
            const maestroBin = join(context.root, 'maestro-home/.maestro/bin');
            mkdirSync(maestroBin, { recursive: true });
            writeFileSync(join(maestroBin, 'maestro'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
          }
          return { status: 0 };
        },
      }),
    ).toBe(0);
    expect(installFailure.stderr.write).not.toHaveBeenCalled();

    const missingPostInstall = io();
    expect(
      setupMaestro(['2.0.6'], {
        cwd: context.root,
        env: { ...context.env, HOME: join(context.root, 'empty-maestro-home'), PATH: context.bin },
        io: missingPostInstall,
        runCommand: (command) =>
          command === 'wget' ? { status: 0, stdout: 'payload' } : { status: 0 },
      }),
    ).toBe(1);
    expect(missingPostInstall.stderr.write).toHaveBeenCalledWith(
      '❌ Maestro installation failed\n',
    );
  });
});
