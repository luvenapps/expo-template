import { join } from 'node:path';
import {
  ensureFastlane as rawEnsureFastlane,
  main as rawMain,
} from '../../.github/scripts/setup_fastlane.mjs';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

type CommandResult = {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
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
  sleep?: (milliseconds: number) => Promise<void> | void;
  appendFile?: (path: string, content: string) => void;
};

const ensureFastlane = rawEnsureFastlane as (argv?: string[], options?: Options) => Promise<number>;
const main = rawMain as (argv?: string[], options?: Options) => Promise<number>;

function io(): TestIO {
  return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
}

describe('Fastlane setup', () => {
  const context = useCiScriptTestContext();

  test('adds the Ruby user bin to GitHub PATH and skips an exact installed version', async () => {
    context.mockCommand('ruby', 'printf "%s" "$HOME/.gem"');
    context.mockCommand('fastlane', 'printf "fastlane 2.228.0\\n"');
    const output = io();
    const sleep = jest.fn();

    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: output,
        sleep,
      }),
    ).toBe(0);
    expect(context.read('github-path.txt')).toBe(`${context.home}/.gem/bin`);
    expect(output.stdout.write).toHaveBeenCalledWith('✅ fastlane 2.228.0 already installed\n');
    expect(output.stdout.write).toHaveBeenCalledWith(
      '✅ Fastlane 2.228.0 successfully installed and verified\n',
    );
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  test('uninstalls a mismatched version, installs the requested version, and verifies it', async () => {
    context.mockCommand('ruby', 'printf "%s" "$HOME/.gem"');
    context.mockCommand(
      'fastlane',
      'if [ -f gem-installed ]; then echo "fastlane 2.228.0"; else echo "fastlane 2.0.0"; fi',
    );
    context.mockCommand(
      'gem',
      'echo "$*" >> gem-commands.log; if [ "$1" = install ]; then touch gem-installed; fi',
    );

    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: io(),
        sleep: jest.fn(),
      }),
    ).toBe(0);
    expect(context.read('gem-commands.log').split('\n')).toEqual([
      'uninstall -aIx fastlane',
      'install -N -q --user-install fastlane -v 2.228.0',
    ]);
  });

  test('reports missing versions, Ruby failures, and installation failures', async () => {
    const output = io();
    expect(await main([], { io: output })).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('Fastlane version required\n');

    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: output,
        runCommand: () => ({ status: 12, stderr: 'ruby failed\n' }),
      }),
    ).toBe(12);
    expect(output.stderr.write).toHaveBeenCalledWith('ruby failed\n');

    context.mockCommand('fastlane', 'echo "fastlane 1.0.0"');
    const results: CommandResult[] = [
      { status: 0, stdout: `${context.home}/.gem` },
      { status: 0, stdout: 'fastlane 1.0.0' },
      { status: 0 },
      { status: 8, stderr: 'gem install failed\n' },
    ];
    const runCommand = jest.fn(() => results.shift() ?? { status: 0 });
    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: output,
        runCommand,
      }),
    ).toBe(8);
  });

  test('reports unavailable Fastlane, unknown versions, and mismatches after install', async () => {
    context.mockCommand('ruby', 'printf "%s" "$HOME/.gem"');
    const absent = { ...context.env, PATH: context.bin };
    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: absent,
        io: io(),
        runCommand: (command) =>
          command === 'ruby' ? { status: 0, stdout: `${context.home}/.gem` } : { status: 0 },
        sleep: jest.fn(),
      }),
    ).toBe(1);

    context.mockCommand('fastlane', 'echo "fastlane beta"');
    context.mockCommand('gem', 'exit 0');
    const mismatch = await ensureFastlane(['2.228.0'], {
      cwd: context.root,
      env: context.env,
      io: io(),
      runCommand: (command) => {
        if (command === 'ruby') return { status: 0, stdout: `${context.home}/.gem` };
        if (command === 'fastlane') return { status: 0, stdout: 'fastlane beta' };
        return { status: 0 };
      },
      sleep: jest.fn(),
    });
    expect(mismatch).toBe(1);

    await expect(
      main(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: io(),
        runCommand: () => {
          throw new Error('spawn failed');
        },
      }),
    ).resolves.toBe(1);
  });

  test('uses process defaults and verifies Fastlane through fake executables', async () => {
    context.mockCommand('ruby', 'printf "%s/.gem" "$HOME"');
    context.mockCommand('fastlane', 'printf "fastlane 2.228.0\\n"');
    const previousArgv = process.argv;
    const previousPath = process.env.PATH;
    const previousHome = process.env.HOME;
    const previousGithubPath = process.env.GITHUB_PATH;
    process.argv = [process.execPath, 'setup_fastlane.mjs', '2.228.0'];
    process.env.PATH = context.bin;
    process.env.HOME = context.home;
    process.env.GITHUB_PATH = join(context.root, 'default-github-path.txt');

    try {
      expect(await ensureFastlane()).toBe(0);
      expect(context.read('default-github-path.txt')).toBe(`${context.home}/.gem/bin`);
    } finally {
      process.argv = previousArgv;
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousGithubPath === undefined) delete process.env.GITHUB_PATH;
      else process.env.GITHUB_PATH = previousGithubPath;
    }
  });

  test('runs the Fastlane MJS CLI with isolated fake commands', () => {
    context.mockCommand('ruby', 'printf "%s/.gem" "$HOME"');
    context.mockCommand('fastlane', 'printf "fastlane 2.228.0\\n"');
    const result = context.runScript('setup_fastlane.mjs', ['2.228.0']);
    expect(result.status).toBe(0);
    expect(context.read('github-path.txt')).toBe(`${context.home}/.gem/bin`);
    expect(result.stdout).toContain('successfully installed and verified');
  });

  test('reports Fastlane command errors and numeric version mismatches after an install', async () => {
    context.mockCommand('ruby', 'printf "%s/.gem" "$HOME"');
    context.mockCommand('fastlane', 'echo "fastlane 2.0.0"');
    context.mockCommand('gem', 'exit 0');
    const currentFailure = io();
    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: currentFailure,
        sleep: jest.fn(),
        runCommand: (command) =>
          command === 'ruby'
            ? { status: 0, stdout: `${context.home}/.gem` }
            : {
                status: null,
                error: Object.assign(new Error('fastlane unavailable'), { code: 'ENOENT' }),
              },
      }),
    ).toBe(1);
    expect(currentFailure.stderr.write).toHaveBeenCalledWith('fastlane unavailable\n');

    let fastlaneCalls = 0;
    const unknownVersion = io();
    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: unknownVersion,
        sleep: jest.fn(),
        runCommand: (command) => {
          if (command === 'ruby') return { status: 0, stdout: `${context.home}/.gem` };
          if (command === 'fastlane') {
            fastlaneCalls += 1;
            return {
              status: 0,
              stdout: fastlaneCalls === 1 ? 'fastlane 2.0.0' : 'fastlane 2.1.0',
            };
          }
          return { status: 0 };
        },
      }),
    ).toBe(1);
    expect(unknownVersion.stderr.write).toHaveBeenCalledWith(
      '❌ Fastlane version mismatch: expected 2.228.0, got 2.1.0\n',
    );
  });

  test('handles Ruby, current Fastlane, install, and post-install command failures', async () => {
    const rubyFailure = io();
    expect(
      await ensureFastlane(['2.228.0'], {
        env: context.env,
        io: rubyFailure,
        runCommand: () => ({
          status: null,
          error: Object.assign(new Error('ruby unavailable'), { code: 'ENOENT' }),
        }),
      }),
    ).toBe(1);
    expect(rubyFailure.stderr.write).toHaveBeenCalledWith('ruby unavailable\n');

    context.mockCommand('fastlane', 'exit 0');
    const currentFailure = io();
    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: currentFailure,
        runCommand: (command) =>
          command === 'ruby'
            ? { status: 0, stdout: `${context.home}/.gem` }
            : { status: 3, stderr: 'current version failed\n' },
      }),
    ).toBe(3);
    expect(currentFailure.stderr.write).toHaveBeenCalledWith('current version failed\n');

    context.mockCommand('ruby', 'printf "%s/.gem" "$HOME"');
    context.mockCommand('gem', 'exit 0');
    const installFailure = io();
    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: { ...context.env, PATH: context.bin },
        io: installFailure,
        runCommand: (command, args) => {
          if (command === 'ruby') return { status: 0, stdout: `${context.home}/.gem` };
          if (command === 'gem' && args[0] === 'install') {
            return {
              status: null,
              stderr: 'gem install output\n',
              error: Object.assign(new Error('gem install failed'), { code: 'EIO' }),
            };
          }
          return { status: 0 };
        },
      }),
    ).toBe(1);
    expect(installFailure.stderr.write).toHaveBeenCalledWith('gem install output\n');
    expect(installFailure.stderr.write).toHaveBeenCalledWith('gem install failed\n');

    context.mockCommand('fastlane', 'exit 0');
    const verificationFailure = io();
    let fastlaneCalls = 0;
    expect(
      await ensureFastlane(['2.228.0'], {
        cwd: context.root,
        env: context.env,
        io: verificationFailure,
        sleep: jest.fn(),
        runCommand: (command, args) => {
          if (command === 'ruby') return { status: 0, stdout: `${context.home}/.gem` };
          if (command === 'fastlane') {
            fastlaneCalls += 1;
            return fastlaneCalls === 1
              ? { status: 0, stdout: 'fastlane 2.0.0' }
              : { status: 1, stderr: 'verification failed\n' };
          }
          return { status: 0 };
        },
      }),
    ).toBe(1);
    expect(verificationFailure.stderr.write).toHaveBeenCalledWith('verification failed\n');
  });
});
