import { existsSync, mkdirSync, readdirSync, utimesSync, writeFileSync } from 'node:fs';
import { basename, delimiter, join } from 'node:path';
import {
  cleanSelfHostedWorkspace as rawCleanSelfHostedWorkspace,
  main as rawMain,
} from '../../.github/scripts/clean_selfhosted_workspace.mjs';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

type TestIO = {
  stdout: { write: (text: string) => unknown };
  stderr: { write: (text: string) => unknown };
};
type Environment = Record<string, string | undefined>;
type RunCommand = (command: string, args: string[], options: Record<string, unknown>) => unknown;
const cleanSelfHostedWorkspace = rawCleanSelfHostedWorkspace as (options?: {
  env?: Environment;
  cwd?: string;
  io?: TestIO;
  runCommand?: RunCommand;
  now?: () => Date;
}) => void;
const main = rawMain as (options?: {
  env?: Environment;
  io?: TestIO;
  fileSystem?: {
    existsSync: (path: string) => boolean;
    statSync: (path: string) => { isDirectory: () => boolean };
    rmSync: () => void;
  };
}) => number;

function io(): TestIO {
  return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
}

describe('self-hosted workspace cleanup', () => {
  const context = useCiScriptTestContext();

  test('removes build outputs, archives E2E artifacts, and preserves reports', () => {
    mkdirSync(join(context.root, 'node_modules'), { recursive: true });
    mkdirSync(join(context.root, 'e2e-artifacts', 'attempt-1'), { recursive: true });
    mkdirSync(join(context.root, 'android/app/build/intermediates'), { recursive: true });
    mkdirSync(join(context.root, 'android/app/build/reports'), { recursive: true });
    mkdirSync(join(context.root, 'ios/build/Build/Products'), { recursive: true });
    mkdirSync(join(context.root, 'ios/build/Logs'), { recursive: true });
    writeFileSync(join(context.root, 'android/app/build/reports/result.txt'), 'report');
    writeFileSync(join(context.root, 'ios/build/Logs/result.txt'), 'log');
    const temporary = join(context.root, 'temporary');
    mkdirSync(join(temporary, 'metro-cache'), { recursive: true });
    mkdirSync(join(temporary, 'keep-cache'), { recursive: true });

    const result = context.runScript('clean_selfhosted_workspace.mjs', [], { TMPDIR: temporary });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('[clean] archiving e2e-artifacts -> e2e-artifacts-');
    expect(
      readdirSync(context.root).filter((entry) => entry.startsWith('e2e-artifacts-')),
    ).toHaveLength(1);
    expect(existsSync(join(context.root, 'node_modules'))).toBe(false);
    expect(existsSync(join(context.root, 'android/app/build/intermediates'))).toBe(false);
    expect(existsSync(join(context.root, 'android/app/build/reports/result.txt'))).toBe(true);
    expect(existsSync(join(context.root, 'ios/build/Build/Products'))).toBe(false);
    expect(existsSync(join(context.root, 'ios/build/Logs/result.txt'))).toBe(true);
    expect(existsSync(join(temporary, 'metro-cache'))).toBe(false);
    expect(existsSync(join(temporary, 'keep-cache'))).toBe(true);
  });

  test('keeps only the newest four archives and tolerates optional cache commands failing', () => {
    for (let index = 0; index < 5; index += 1) {
      const archive = join(context.root, `e2e-artifacts-old-${index}`);
      mkdirSync(archive);
      const timestamp = new Date(1_700_000_000_000 + index * 1000);
      utimesSync(archive, timestamp, timestamp);
    }
    mkdirSync(join(context.root, 'e2e-artifacts'));
    mkdirSync(join(context.home, '.gradle/caches'), { recursive: true });
    mkdirSync(join(context.home, '.gradle/wrapper'), { recursive: true });
    const derivedData = join(context.home, 'Library/Developer/Xcode/DerivedData');
    mkdirSync(join(derivedData, `${basename(context.root)}-project`), { recursive: true });
    mkdirSync(join(derivedData, 'unrelated-project'), { recursive: true });
    context.mockCommand('watchman', 'printf "%s\\n" "$*" >> "$CLEAN_COMMANDS"; exit 4');
    context.mockCommand('pnpm', 'printf "%s\\n" "$*" >> "$CLEAN_COMMANDS"; exit 4');
    const commandLog = join(context.root, 'commands.log');

    const result = context.runScript('clean_selfhosted_workspace.mjs', [], {
      CLEAN_COMMANDS: commandLog,
      CLEAN_GLOBAL_GRADLE: '1',
      CLEAN_DERIVEDDATA: '1',
      CLEAN_WATCHMAN: '1',
      CLEAN_PNPM_STORE: '1',
    });

    expect(result.status).toBe(0);
    expect(
      readdirSync(context.root).filter((entry) => entry.startsWith('e2e-artifacts-')),
    ).toHaveLength(4);
    expect(existsSync(join(context.home, '.gradle/caches'))).toBe(false);
    expect(existsSync(join(context.home, '.gradle/wrapper'))).toBe(false);
    expect(existsSync(join(derivedData, `${basename(context.root)}-project`))).toBe(false);
    expect(existsSync(join(derivedData, 'unrelated-project'))).toBe(true);
    expect(context.read('commands.log')).toBe('watch-del-all\nstore prune');
    expect(result.stdout).toContain('watchman watch-del-all');
    expect(result.stdout).toContain('pnpm store prune');
  });

  test('reports a missing workspace and skips absent optional tools', () => {
    const failure = context.runScript('clean_selfhosted_workspace.mjs', [], {
      GITHUB_WORKSPACE: join(context.root, 'missing'),
    });
    expect(failure.status).toBe(1);
    expect(failure.stderr).toContain('No such directory:');

    const noTools = context.runScript('clean_selfhosted_workspace.mjs', [], {
      CLEAN_DERIVEDDATA: '1',
      CLEAN_WATCHMAN: '1',
      CLEAN_PNPM_STORE: '1',
      PATH: context.bin,
    });
    expect(noTools.status).toBe(0);
    expect(noTools.stdout).toContain('watchman not installed, skipping');
    expect(noTools.stdout).toContain('skip (missing):');
  });

  test('runs the exported cleanup with scoped DerivedData and ignores missing TMPDIR matches', () => {
    mkdirSync(join(context.root, 'e2e-artifacts'));
    for (let index = 0; index < 5; index += 1) {
      mkdirSync(join(context.root, `e2e-artifacts-old-${index}`));
    }
    mkdirSync(join(context.root, 'android/app/build'), { recursive: true });
    mkdirSync(join(context.root, 'ios/build'), { recursive: true });
    mkdirSync(join(context.home, '.gradle/caches'), { recursive: true });
    const derived = join(context.home, 'Library/Developer/Xcode/DerivedData');
    mkdirSync(join(derived, `${basename(context.root)}-matching-build`), { recursive: true });
    mkdirSync(join(derived, 'unrelated-build'), { recursive: true });
    const temporary = join(context.root, 'temporary');
    mkdirSync(join(temporary, 'metro-cache'), { recursive: true });
    mkdirSync(join(temporary, 'keep-cache'), { recursive: true });
    context.mockCommand('watchman', 'exit 0');
    context.mockCommand('pnpm', 'exit 0');
    const output = io();
    const runCommand = jest.fn(() => ({ status: 9 }));

    cleanSelfHostedWorkspace({
      cwd: context.root,
      io: output,
      now: () => new Date(2026, 0, 2, 3, 4, 5),
      runCommand,
      env: {
        GITHUB_WORKSPACE: context.root,
        HOME: context.home,
        TMPDIR: temporary,
        PATH: `${context.bin}${delimiter}`,
        CLEAN_GLOBAL_GRADLE: '1',
        CLEAN_DERIVEDDATA: '1',
        CLEAN_WATCHMAN: '1',
        CLEAN_PNPM_STORE: '1',
      },
    });

    expect(output.stdout.write).toHaveBeenCalledWith(
      '[clean] archiving e2e-artifacts -> e2e-artifacts-20260102-030405\n',
    );
    expect(existsSync(join(derived, `${basename(context.root)}-matching-build`))).toBe(false);
    expect(existsSync(join(derived, 'unrelated-build'))).toBe(true);
    expect(existsSync(join(temporary, 'metro-cache'))).toBe(false);
    expect(runCommand).toHaveBeenCalledTimes(2);

    const noOptions = io();
    const emptyWorkspace = join(context.root, 'empty-workspace');
    mkdirSync(emptyWorkspace);
    writeFileSync(join(emptyWorkspace, 'e2e-artifacts'), 'not a directory');
    cleanSelfHostedWorkspace({
      cwd: emptyWorkspace,
      io: noOptions,
      env: {
        GITHUB_WORKSPACE: emptyWorkspace,
        HOME: context.home,
        TMPDIR: join(context.root, 'missing-temporary'),
        PATH: '',
        CLEAN_DERIVEDDATA: '1',
        CLEAN_WATCHMAN: '1',
        CLEAN_PNPM_STORE: '1',
      },
    });
    expect(noOptions.stdout.write).toHaveBeenCalledWith(
      '[clean] No project-scoped DerivedData found; set CLEAN_DERIVEDDATA=all to remove all\n',
    );
    expect(noOptions.stdout.write).toHaveBeenCalledWith(
      '[clean] watchman not installed, skipping\n',
    );
    expect(noOptions.stdout.write).toHaveBeenCalledWith(
      '[clean] skip (missing): android/app/build\n',
    );
    expect(noOptions.stdout.write).toHaveBeenCalledWith('[clean] skip (missing): ios/build\n');

    const minimal = io();
    expect(
      main({
        env: { GITHUB_WORKSPACE: emptyWorkspace, HOME: join(context.root, 'empty-home') },
        io: minimal,
      }),
    ).toBe(0);
    expect(
      main({
        env: {
          GITHUB_WORKSPACE: emptyWorkspace,
          HOME: join(context.root, 'missing-derived-data-home'),
          CLEAN_DERIVEDDATA: '1',
        },
        io: minimal,
      }),
    ).toBe(0);
    expect(minimal.stdout.write).toHaveBeenCalledWith(
      `[clean] skip (missing): ${join(context.root, 'missing-derived-data-home/Library/Developer/Xcode/DerivedData')}\n`,
    );

    const fileWorkspace = join(context.root, 'workspace-file');
    writeFileSync(fileWorkspace, 'not a directory');
    expect(main({ env: { GITHUB_WORKSPACE: fileWorkspace }, io: minimal })).toBe(1);

    const bestEffort = io();
    cleanSelfHostedWorkspace({
      cwd: emptyWorkspace,
      io: bestEffort,
      env: { GITHUB_WORKSPACE: emptyWorkspace, HOME: join(context.root, 'empty-home') },
      fileSystem: {
        existsSync: (candidate: string) =>
          candidate === emptyWorkspace ||
          candidate.endsWith('android/app/build') ||
          candidate.endsWith('ios/build'),
        statSync: () => ({ isDirectory: () => true }),
        rmSync: () => {
          throw new Error('build cleanup failed');
        },
        readdirSync: () => [],
        renameSync: jest.fn(),
      },
    } as never);
    expect(bestEffort.stderr.write).not.toHaveBeenCalled();

    expect(main({ env: { GITHUB_WORKSPACE: join(context.root, 'missing') }, io: output })).toBe(1);
    expect(
      main({
        env: { GITHUB_WORKSPACE: context.root },
        io: output,
        fileSystem: {
          existsSync: () => true,
          statSync: () => ({ isDirectory: () => true }),
          rmSync: () => {
            throw new Error('rm failed');
          },
        },
      }),
    ).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith('rm failed\n');
  });
});
