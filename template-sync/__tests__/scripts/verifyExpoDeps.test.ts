import process from 'node:process';
import {
  main as rawMain,
  verifyExpoDependencies as rawVerifyExpoDependencies,
} from '../../.github/scripts/verify_expo_deps.mjs';
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

const verifyExpoDependencies = rawVerifyExpoDependencies as (options?: {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  io?: TestIO;
  runCommand?: RunCommand;
}) => number;
const main = rawMain as (options?: {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  io?: TestIO;
  runCommand?: RunCommand;
}) => number;

function io(): TestIO {
  return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
}

describe('Expo dependency verification', () => {
  const context = useCiScriptTestContext();

  test('prints diagnostic commands and returns success when the strict check passes', () => {
    const output = io();
    const runCommand = jest.fn((command: string, args: string[]) => ({
      status: args[2] === 'install' ? 0 : 1,
      stdout: `${command} ${args.join(' ')}\n`,
      stderr: '',
    }));

    expect(verifyExpoDependencies({ cwd: '/fixture', io: output, runCommand })).toBe(0);
    expect(runCommand.mock.calls.map(([command, args]) => [command, args])).toEqual([
      ['pnpm', ['exec', 'expo', '--version']],
      ['node', ['-e', "console.log('react-native', require('react-native/package.json').version)"]],
      ['node', ['-e', "console.log('expo', require('expo/package.json').version)"]],
      ['pnpm', ['exec', 'expo', 'install', '--check']],
    ]);
    expect(output.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('pnpm exec expo --version'),
    );
  });

  test('returns failure only for the strict dependency check and reports missing commands', () => {
    const output = io();
    const runCommand = jest
      .fn()
      .mockReturnValueOnce({ status: 0, stdout: 'Expo 58\n' })
      .mockReturnValueOnce({ status: 0, stdout: 'react-native 0.88.1\n' })
      .mockReturnValueOnce({ status: 0, stdout: 'expo 58.0.23\n' })
      .mockReturnValueOnce({
        status: null,
        error: Object.assign(new Error('pnpm missing'), { code: 'ENOENT' }),
      });

    expect(verifyExpoDependencies({ io: output, runCommand })).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('pnpm missing\n');
    expect(output.stdout.write).toHaveBeenCalledWith(
      '⚠️ Expo dependency drift detected. Run pnpm exec expo install --fix locally to align versions.\n',
    );
  });

  test('handles command results without status and catches runner exceptions in main', () => {
    const output = io();
    const runCommand = jest
      .fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: null });
    expect(verifyExpoDependencies({ io: output, runCommand })).toBe(1);

    expect(
      main({
        io: output,
        runCommand: () => {
          throw new Error('spawn failed');
        },
      }),
    ).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('spawn failed\n');
  });

  test('uses process defaults and runs the MJS entrypoint with a fake pnpm exec command', () => {
    context.mockCommand(
      'pnpm',
      'if [ "$3" = install ]; then echo "strict check"; exit 0; fi\necho diagnostic',
    );
    const previousPath = process.env.PATH;
    process.env.PATH = `${context.bin}${process.env.PATH ? `:${process.env.PATH}` : ''}`;
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      expect(main()).toBe(0);
      expect(context.runScript('verify_expo_deps.mjs').status).toBe(0);
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });
});
