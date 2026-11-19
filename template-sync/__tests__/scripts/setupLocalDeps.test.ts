import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  main as rawMain,
  setupLocalDependencies as rawSetupLocalDependencies,
} from '../../scripts/setup-local-deps.mjs';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

type TestIO = {
  stdout: { write: (text: string) => unknown };
  stderr: { write: (text: string) => unknown };
};
type Environment = Record<string, string | undefined>;
type CommandResult = {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error & { code?: string };
};
type RunCommand = (
  command: string,
  args: string[],
  options: Record<string, unknown>,
) => CommandResult;
type FileSystem = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: string) => string;
  appendFileSync: (path: string, data: string) => void;
};
const setupLocalDependencies = rawSetupLocalDependencies as (options?: {
  root?: string;
  env?: Environment;
  io?: TestIO;
  runCommand?: RunCommand;
  fileSystem?: FileSystem;
}) => number;
const main = rawMain as (options?: { io?: TestIO; fileSystem?: FileSystem }) => number;

function io(): TestIO {
  return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
}

describe('local dependency setup', () => {
  const context = useCiScriptTestContext();

  function setupFixture() {
    writeFileSync(join(context.root, '.mise.toml'), '[settings]\nmin_version = "2026.1.0"\n');
    mkdirSync(context.home, { recursive: true });
    context.mockCommand(
      'brew',
      'case "$*" in\n  "list --versions watchman"|"list --versions mise") exit 0 ;;\n  "list --versions fastlane") echo "fastlane 2.228.0" ;;\n  "list --cask --versions maestro") echo "maestro 2.0.6" ;;\n  *) echo "unexpected brew command: $*" >&2; exit 90 ;;\nesac',
    );
    context.mockCommand('mise', 'printf "%s\\n" "$*" >> "$MISE_COMMANDS"');
  }

  test('runs the real CLI with the pinned Homebrew tools and updates the isolated shell profile', () => {
    setupFixture();
    const result = context.runProjectScript('setup-local-deps.mjs', [], {
      MISE_COMMANDS: join(context.root, 'mise.log'),
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('mise already installed; skipping');
    expect(result.stdout).toContain('fastlane 2.228.0 already installed; skipping');
    expect(result.stdout).toContain('maestro 2.0.6 already installed; skipping');
    expect(result.stdout).toContain('Next step: pnpm install --frozen-lockfile');
    expect(readFileSync(join(context.home, '.zshrc'), 'utf8')).toContain(
      'eval "$(mise activate zsh)"',
    );
    expect(context.read('mise.log')).toContain('trust');
    expect(context.read('mise.log')).toContain('exec -- java -version');
  });

  test('installs absent packages and falls back to unpinned Fastlane when the pinned formula fails', () => {
    writeFileSync(join(context.root, '.mise.toml'), 'min_version = "2026.1.0"\n');
    context.mockCommand(
      'brew',
      'case "$*" in\n  "list --versions "*) exit 1 ;;\n  "list --cask --versions maestro") exit 1 ;;\n  "install fastlane@2.228.0") exit 8 ;;\n  "install fastlane") exit 0 ;;\n  "install --cask maestro"|"install watchman"|"install mise") exit 0 ;;\n  *) exit 90 ;;\nesac',
    );
    context.mockCommand('mise', 'exit 0');

    const result = context.runProjectScript('setup-local-deps.mjs', [], {
      MISE_COMMANDS: join(context.root, 'mise.log'),
      SHELL: '/bin/bash',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Installing watchman via Homebrew');
    expect(result.stdout).toContain('Installing mise (required >= 2026.1.0)');
    expect(result.stdout).toContain('Installing fastlane 2.228.0 via Homebrew');
    expect(result.stdout).toContain('Installing maestro 2.0.6 via Homebrew');
    expect(result.stdout).toContain('.bashrc');
    expect(readFileSync(join(context.home, '.bashrc'), 'utf8')).toContain('mise activate bash');
  });

  test('fails clearly when Homebrew is unavailable or a required install fails', () => {
    const missing = context.runProjectScript('setup-local-deps.mjs', [], { PATH: '' });
    expect(missing.status).toBe(1);
    expect(missing.stdout).toContain('Homebrew is required');

    writeFileSync(join(context.root, '.mise.toml'), 'min_version = "2026.1.0"\n');
    context.mockCommand('brew', 'if [ "$1" = list ]; then exit 1; fi\nexit 8');
    const failedInstall = context.runProjectScript('setup-local-deps.mjs', [], {
      PATH: context.bin,
    });
    expect(failedInstall.status).toBe(8);
  });

  test('does not duplicate mise activation and catches filesystem or command errors', () => {
    setupFixture();
    writeFileSync(join(context.home, '.zshrc'), 'eval "$(mise activate zsh)"\n');
    const result = context.runProjectScript('setup-local-deps.mjs', [], {
      MISE_COMMANDS: join(context.root, 'mise.log'),
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('mise activation already present');
    expect(existsSync(join(context.home, '.bashrc'))).toBe(false);

    context.mockCommand('mise', 'exit 0');
    const missingConfig = context.runProjectScript('setup-local-deps.mjs', [], {
      PATH: context.bin,
      MISE_COMMANDS: join(context.root, 'mise.log'),
    });
    expect(missingConfig.status).toBe(0);
  });

  test('covers exported setup behavior and reports thrown filesystem errors', () => {
    writeFileSync(join(context.root, '.mise.toml'), 'min_version = "2026.1.0"\n');
    context.mockCommand('brew', 'exit 0');
    const output = io();
    const runCommand: RunCommand = (command, args) => {
      if (command === 'brew' && args[0] === 'list') {
        const packageName = args.at(-1);
        return {
          status: 0,
          stdout:
            packageName === 'fastlane'
              ? 'fastlane 2.228.0\n'
              : packageName === 'maestro'
                ? 'maestro 2.0.6\n'
                : '',
        };
      }
      return { status: 0 };
    };

    expect(
      setupLocalDependencies({
        root: context.root,
        env: { PATH: context.bin, HOME: context.home, SHELL: '/bin/zsh' },
        io: output,
        runCommand,
      }),
    ).toBe(0);
    expect(output.stdout.write).toHaveBeenCalledWith(
      '✅ fastlane 2.228.0 already installed; skipping\n',
    );

    const failing = io();
    expect(
      main({
        io: failing,
        fileSystem: {
          existsSync: () => true,
          readFileSync: () => {
            throw new Error('config read failed');
          },
          appendFileSync: jest.fn(),
        },
      }),
    ).toBe(1);
    expect(failing.stderr.write).toHaveBeenCalledWith('config read failed\n');
  });

  test('installs missing tools, falls back from pinned Fastlane, and tolerates toolchain check failures', () => {
    context.mockCommand('brew', 'exit 0');
    const output = io();
    const runCommand: RunCommand = (command, args) => {
      const key = args.join(' ');
      if (command === 'brew' && key.startsWith('list ')) {
        if (key.endsWith('watchman')) {
          return {
            status: null,
            error: Object.assign(new Error('not installed'), { code: 'ENOENT' }),
          };
        }
        if (key.endsWith('fastlane')) return { status: 0, stdout: 'fastlane 1.0.0\n' };
        return { status: 1 };
      }
      if (command === 'brew' && key === 'install fastlane@2.228.0') {
        return { status: 7, stderr: 'pinned formula unavailable\n' };
      }
      if (command === 'brew' && key.startsWith('install')) {
        return { status: 0, stdout: `installed ${key}\n` };
      }
      if (command === 'mise' && key.startsWith('exec')) {
        return {
          status: null,
          error: Object.assign(new Error('tool missing'), { code: 'ENOENT' }),
        };
      }
      return { status: 0 };
    };

    expect(
      setupLocalDependencies({
        root: context.root,
        env: { PATH: context.bin, HOME: context.home, SHELL: '/usr/bin/bash' },
        io: output,
        runCommand,
      }),
    ).toBe(0);
    expect(output.stderr.write).toHaveBeenCalledWith('pinned formula unavailable\n');
    expect(output.stderr.write).toHaveBeenCalledWith('tool missing\n');
    expect(output.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('Installing watchman'),
    );
    expect(output.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Installing mise'));
    expect(output.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('Installing fastlane'),
    );
    expect(output.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Installing maestro'));
    expect(readFileSync(join(context.home, '.bashrc'), 'utf8')).toContain('mise activate bash');
  });

  test('returns on a failed required install, handles missing Homebrew and config, and uses an existing profile', () => {
    const noBrew = io();
    expect(
      setupLocalDependencies({
        root: context.root,
        env: { PATH: '', HOME: context.home },
        io: noBrew,
        runCommand: () => ({ status: 0 }),
      }),
    ).toBe(1);
    expect(noBrew.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('Homebrew is required'),
    );

    context.mockCommand('brew', 'exit 0');
    const failedInstall = setupLocalDependencies({
      root: context.root,
      env: { PATH: context.bin, HOME: context.home },
      io: io(),
      runCommand: (_command, args) =>
        args[0] === 'list'
          ? { status: 1 }
          : {
              status: null,
              error: Object.assign(new Error('brew install failed'), { code: 'EIO' }),
            },
    });
    expect(failedInstall).toBe(1);

    writeFileSync(join(context.home, '.zshrc'), 'mise activate zsh\n');
    const noConfig = setupLocalDependencies({
      root: context.root,
      env: { PATH: context.bin, HOME: context.home, SHELL: '/bin/zsh' },
      io: io(),
      runCommand: () => ({ status: 0 }),
      fileSystem: {
        existsSync: () => false,
        readFileSync: () => {
          throw new Error('not expected');
        },
        appendFileSync: jest.fn(),
      },
    });
    expect(noConfig).toBe(0);
  });
});
