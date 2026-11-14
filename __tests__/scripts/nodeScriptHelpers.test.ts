import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  cleanSelfhostedWorkspace,
  main as cleanMain,
} from '../../.github/scripts/clean_selfhosted_workspace.mjs';
import {
  exportAndDeployWeb,
  main as deployMain,
} from '../../.github/scripts/export_and_deploy_web.mjs';
import {
  mapRuntimeEnv,
  main as mapRuntimeEnvMain,
} from '../../.github/scripts/map_runtime_env.mjs';
import { ensureFastlane, main as fastlaneMain } from '../../.github/scripts/setup_fastlane.mjs';
import { setupMaestro, main as maestroMain } from '../../.github/scripts/setup_maestro.mjs';
import {
  main as localDependenciesMain,
  setupLocalDependencies,
} from '../../scripts/setup-local-deps.mjs';
import {
  main as verifyExpoMain,
  verifyExpoDependencies,
} from '../../.github/scripts/verify_expo_deps.mjs';

function createIo() {
  return { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
}

function result(status = 0, stdout = '', stderr = '') {
  return { status, stdout, stderr };
}

describe('self-hosted workspace cleanup', () => {
  let root: string;
  let workspace: string;
  let home: string;
  let temp: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cleanup-script-'));
    workspace = join(root, 'workspace');
    home = join(root, 'home');
    temp = join(root, 'tmp');
    mkdirSync(workspace);
    mkdirSync(home);
    mkdirSync(temp);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test('cleans scoped build outputs, archives artifacts, and runs opted-in maintenance', () => {
    mkdirSync(join(workspace, 'node_modules'), { recursive: true });
    mkdirSync(join(workspace, 'e2e-artifacts', 'attempt-1'), { recursive: true });
    for (let index = 1; index <= 5; index += 1) {
      const archive = join(workspace, `e2e-artifacts-old-${index}`);
      mkdirSync(archive);
      utimesSync(archive, new Date(2020, 0, index), new Date(2020, 0, index));
    }

    for (const name of ['intermediates', 'outputs', 'tmp', 'generated', 'transforms', 'reports']) {
      mkdirSync(join(workspace, 'android/app/build', name), { recursive: true });
    }
    for (const name of [
      'Build/Intermediates.noindex',
      'Build/Products',
      'Build/GeneratedSources',
      'Build/Index.noindex',
      'Build/PrecompiledHeaders',
      'Logs',
    ]) {
      mkdirSync(join(workspace, 'ios/build', name), { recursive: true });
    }
    mkdirSync(join(workspace, 'android/.gradle'), { recursive: true });
    mkdirSync(join(temp, 'metro-cache'), { recursive: true });
    mkdirSync(join(temp, 'other-cache'), { recursive: true });
    mkdirSync(join(home, '.gradle/caches'), { recursive: true });
    mkdirSync(join(home, '.gradle/wrapper'), { recursive: true });
    const derivedData = join(home, 'Library/Developer/Xcode/DerivedData');
    mkdirSync(join(derivedData, `project-${workspace.split('/').at(-1)}`), { recursive: true });
    mkdirSync(join(derivedData, 'other-project'), { recursive: true });

    const io = createIo();
    const commands: string[] = [];
    cleanSelfhostedWorkspace({
      env: {
        GITHUB_WORKSPACE: workspace,
        HOME: home,
        TMPDIR: temp,
        CLEAN_GLOBAL_GRADLE: '1',
        CLEAN_DERIVEDDATA: '1',
        CLEAN_WATCHMAN: '1',
        CLEAN_NPM_CACHE: '1',
        PATH: '',
      },
      io,
      now: () => new Date(2025, 0, 2, 3, 4, 5),
      commandExists: () => true,
      runCommand: (command: string, args: string[]) => {
        commands.push([command, ...args].join(' '));
        return result();
      },
    });

    expect(existsSync(join(workspace, 'node_modules'))).toBe(false);
    expect(existsSync(join(workspace, 'android/app/build/intermediates'))).toBe(false);
    expect(existsSync(join(workspace, 'android/app/build/reports'))).toBe(true);
    expect(existsSync(join(workspace, 'ios/build/Build/Products'))).toBe(false);
    expect(existsSync(join(workspace, 'ios/build/Logs'))).toBe(true);
    expect(existsSync(join(workspace, 'android/.gradle'))).toBe(false);
    expect(existsSync(join(temp, 'metro-cache'))).toBe(false);
    expect(existsSync(join(temp, 'other-cache'))).toBe(true);
    expect(existsSync(join(home, '.gradle/caches'))).toBe(false);
    expect(existsSync(join(derivedData, `project-${workspace.split('/').at(-1)}`))).toBe(false);
    expect(existsSync(join(derivedData, 'other-project'))).toBe(true);
    expect(readdirSync(workspace).filter((name) => name.startsWith('e2e-artifacts-'))).toHaveLength(
      4,
    );
    expect(commands).toEqual([
      'watchman watch-del-all',
      'npm cache verify',
      'npm cache clean --force',
    ]);
    expect(io.stdout.write).toHaveBeenCalledWith(expect.stringContaining('keeping last 4'));
  });

  test('leaves global caches alone by default and reports a missing workspace', () => {
    mkdirSync(join(home, '.gradle/caches'), { recursive: true });
    cleanSelfhostedWorkspace({
      env: { HOME: home, CLEAN_WATCHMAN: '1', CLEAN_NPM_CACHE: '1', PATH: '' },
      cwd: workspace,
      io: createIo(),
    });
    expect(existsSync(join(home, '.gradle/caches'))).toBe(true);

    const io = createIo();
    expect(cleanMain({ env: { GITHUB_WORKSPACE: join(root, 'missing') }, io })).toBe(1);
    expect(io.stderr.write).toHaveBeenCalled();
  });

  test('keeps CLEAN_DERIVEDDATA scoped when no workspace match exists', () => {
    const derivedData = join(home, 'Library/Developer/Xcode/DerivedData');
    mkdirSync(join(derivedData, 'another-project'), { recursive: true });
    const io = createIo();
    cleanSelfhostedWorkspace({
      env: { GITHUB_WORKSPACE: workspace, HOME: home, CLEAN_DERIVEDDATA: '1' },
      io,
    });
    expect(existsSync(join(derivedData, 'another-project'))).toBe(true);
    expect(io.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('No project-scoped DerivedData'),
    );
  });

  test('skips optional maintenance when its commands or temporary directory are absent', () => {
    const io = createIo();
    cleanSelfhostedWorkspace({
      env: {
        GITHUB_WORKSPACE: workspace,
        CLEAN_WATCHMAN: '1',
        CLEAN_NPM_CACHE: '1',
        TMPDIR: join(root, 'missing-tmp'),
      },
      io,
      commandExists: () => false,
    });
    expect(io.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('watchman not installed, skipping'),
    );
  });

  test('uses default process options while keeping cleanup inside the temporary workspace', () => {
    const previousCwd = process.cwd();
    const keys = [
      'GITHUB_WORKSPACE',
      'HOME',
      'TMPDIR',
      'PATH',
      'CLEAN_WATCHMAN',
      'CLEAN_NPM_CACHE',
    ];
    const previous = new Map(keys.map((key) => [key, process.env[key]]));
    try {
      process.chdir(workspace);
      process.env.GITHUB_WORKSPACE = workspace;
      process.env.HOME = home;
      process.env.TMPDIR = temp;
      process.env.PATH = join(root, 'missing-bin');
      process.env.CLEAN_WATCHMAN = '1';
      process.env.CLEAN_NPM_CACHE = '1';
      cleanSelfhostedWorkspace();
      expect(cleanMain()).toBe(0);
    } finally {
      process.chdir(previousCwd);
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

describe('web export and deployment', () => {
  test('validates required inputs before exporting', () => {
    const io = createIo();
    expect(exportAndDeployWeb([], { env: {}, io, runCommand: jest.fn() })).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
    expect(exportAndDeployWeb(['push'], { env: {}, io, runCommand: jest.fn() })).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith(expect.stringContaining('EAS_CLI_VERSION'));
  });

  test('exports, deploys a PR alias, prints both URLs, and preserves stderr output', () => {
    const io = createIo();
    const runCommand = jest.fn(
      (command: string, args: string[], options: { stdio?: unknown[] }) => {
        if (args[0] === 'expo') return result(0, 'Export complete\n', 'Export warning\n');
        writeSync(
          options.stdio?.[1] as number,
          'Deployment URL https://deploy.example\nAlias URL https://pr.example\n',
        );
        return result();
      },
    );

    expect(
      exportAndDeployWeb(['pull_request', '42'], {
        env: { EAS_CLI_VERSION: '1.2.3' },
        io,
        cwd: '/tmp',
        runCommand,
      }),
    ).toBe(0);
    expect(runCommand).toHaveBeenNthCalledWith(
      2,
      'npx',
      ['eas-cli@1.2.3', 'deploy', '--non-interactive', '--alias', 'pr-42'],
      expect.objectContaining({ cwd: '/tmp' }),
    );
    expect(io.stdout.write.mock.calls.map(([value]) => value).join('')).toBe(
      'https://pr.example\nhttps://deploy.example\n',
    );
    expect(io.stderr.write).toHaveBeenCalledWith('Export complete\n');
    expect(io.stderr.write).toHaveBeenCalledWith('Export warning\n');
  });

  test('returns export failures and rejects a missing PR number after export', () => {
    const io = createIo();
    const failedExport = jest.fn(() => result(13, '', 'export failed\n'));
    expect(
      exportAndDeployWeb(['push'], { env: { EAS_CLI_VERSION: '1' }, io, runCommand: failedExport }),
    ).toBe(13);
    expect(
      exportAndDeployWeb(['pull_request'], {
        env: { EAS_CLI_VERSION: '1' },
        io,
        runCommand: () => result(),
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith(
      'PR number is required for pull_request events.\n',
    );
  });

  test('normalizes deploy failures and uses the production alias when needed', () => {
    const io = createIo();
    let deployFailure = true;
    const runCommand = (command: string, args: string[], options: { stdio?: unknown[] }) => {
      if (args[0] === 'expo') return result();
      writeSync(options.stdio?.[1] as number, 'Alias URL https://fallback.example\n');
      if (deployFailure) {
        deployFailure = false;
        return result(12, '', '');
      }
      return result();
    };

    expect(exportAndDeployWeb(['push'], { env: { EAS_CLI_VERSION: '1' }, io, runCommand })).toBe(1);
    expect(exportAndDeployWeb(['push'], { env: { EAS_CLI_VERSION: '1' }, io, runCommand })).toBe(0);
    expect(io.stdout.write.mock.calls.map(([value]) => value).join('')).toContain(
      'https://fallback.example\n\n',
    );
    expect(
      deployMain(['push'], {
        env: { EAS_CLI_VERSION: '1' },
        io,
        runCommand: () => {
          throw new Error('spawn failed');
        },
      }),
    ).toBe(1);
  });

  test('handles spawn errors, empty deploy logs, and thrown deployment commands', () => {
    const io = createIo();
    const missing = Object.assign(new Error('npx missing'), { code: 'ENOENT' });
    expect(
      exportAndDeployWeb(['push'], {
        env: { EAS_CLI_VERSION: '1' },
        io,
        runCommand: () => ({ status: null, error: missing }),
      }),
    ).toBe(127);
    expect(io.stderr.write).toHaveBeenCalledWith('npx missing\n');

    expect(
      exportAndDeployWeb(['push'], {
        env: { EAS_CLI_VERSION: '1' },
        io,
        runCommand: (_command: string, args: string[], options: { stdio?: unknown[] }) => {
          if (args[0] === 'expo') return result();
          writeSync(options.stdio?.[1] as number, '');
          return result();
        },
      }),
    ).toBe(0);
    expect(io.stdout.write).toHaveBeenCalledWith('\n');

    expect(
      deployMain(['push'], {
        env: { EAS_CLI_VERSION: '1' },
        io,
        runCommand: (_command: string, args: string[]) => {
          if (args[0] === 'expo') return result();
          throw new Error('deploy spawn failed');
        },
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith('deploy spawn failed\n');
  });
});

describe('runtime environment mapping', () => {
  test('writes all existing mappings and leaves optional Firebase values empty', () => {
    const writes: string[] = [];
    const env = {
      NODE_ENV: 'test' as const,
      GITHUB_ENV: '/tmp/github-env',
      TURN_ON_FIREBASE: 'true',
      RETRIES_VALUE: '2',
      RETRY_DELAY_VALUE: '5',
      PUBLIC_SUPABASE_URL: 'https://db.example',
      PUBLIC_SUPABASE_ANON_KEY: 'public-key',
      SUPABASE_ACCESS_TOKEN_VALUE: 'access-token',
    };
    mapRuntimeEnv(env, ((file: string, content: string) => {
      writes.push(`${file}:${content}`);
    }) as never);
    expect(writes).toHaveLength(14);
    expect(writes).toContain('/tmp/github-env:EXPO_PUBLIC_TURN_ON_FIREBASE=true\n');
    expect(writes).toContain('/tmp/github-env:EXPO_PUBLIC_FIREBASE_API_KEY=\n');
    expect(writes).toContain('/tmp/github-env:EXPO_PUBLIC_SUPABASE_URL=https://db.example\n');
    expect(writes).toContain('/tmp/github-env:SUPABASE_ACCESS_TOKEN=access-token\n');
  });

  test('reports missing required variables and GITHUB_ENV', () => {
    const io = createIo();
    expect(
      mapRuntimeEnvMain(
        { NODE_ENV: 'test' as const, GITHUB_ENV: '/tmp/file' },
        jest.fn(),
        io as never,
      ),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith(expect.stringContaining('TURN_ON_FIREBASE'));
    expect(
      mapRuntimeEnvMain(
        {
          NODE_ENV: 'test' as const,
          TURN_ON_FIREBASE: 'false',
          RETRIES_VALUE: '2',
          RETRY_DELAY_VALUE: '5',
        },
        jest.fn(),
        io as never,
      ),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith(expect.stringContaining('GITHUB_ENV'));
  });

  test('maps populated optional values and reports write failures', () => {
    const writes: string[] = [];
    const env = {
      NODE_ENV: 'test' as const,
      GITHUB_ENV: '/tmp/github-env',
      TURN_ON_FIREBASE: 'true',
      RETRIES_VALUE: '2',
      RETRY_DELAY_VALUE: '5',
      FIREBASE_API_KEY: 'api-key',
      FIREBASE_APP_ID: 'app-id',
      FIREBASE_AUTH_DOMAIN: 'auth.example',
      FIREBASE_MEASUREMENT_ID: 'measurement-id',
      FIREBASE_MESSAGING_SENDER_ID: 'sender-id',
      FIREBASE_PROJECT_ID: 'project-id',
      FIREBASE_STORAGE_BUCKET: 'bucket.example',
      FIREBASE_VAPID_KEY: 'vapid-key',
      PUBLIC_SUPABASE_URL: 'https://db.example',
      PUBLIC_SUPABASE_ANON_KEY: 'public-key',
      SUPABASE_ACCESS_TOKEN_VALUE: 'access-token',
    };
    mapRuntimeEnv(env, ((_file: string, content: string) => {
      writes.push(content);
    }) as never);
    expect(writes).toContain('EXPO_PUBLIC_FIREBASE_API_KEY=api-key\n');
    expect(writes).toContain('EXPO_PUBLIC_FIREBASE_VAPID_KEY=vapid-key\n');

    const io = createIo();
    expect(
      mapRuntimeEnvMain(
        { ...env },
        () => {
          throw new Error('cannot write');
        },
        io as never,
      ),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith('cannot write\n');
  });

  test('uses default environment and output handling without writing outside the test', () => {
    const keys = ['GITHUB_ENV', 'TURN_ON_FIREBASE', 'RETRIES_VALUE', 'RETRY_DELAY_VALUE'];
    const previous = new Map(keys.map((key) => [key, process.env[key]]));
    try {
      delete process.env.GITHUB_ENV;
      process.env.TURN_ON_FIREBASE = 'true';
      process.env.RETRIES_VALUE = '2';
      process.env.RETRY_DELAY_VALUE = '5';
      expect(mapRuntimeEnvMain()).toBe(1);
      expect(() => mapRuntimeEnv()).toThrow('GITHUB_ENV: unbound variable');
    } finally {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

describe('Fastlane setup', () => {
  let root: string;
  let bin: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fastlane-setup-'));
    bin = join(root, 'bin');
    mkdirSync(bin);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test('uses the installed version when it already matches', async () => {
    writeFileSync(join(bin, 'fastlane'), '', { mode: 0o755 });
    const io = createIo();
    const appends: string[] = [];
    const runCommand = (command: string, args: string[]) =>
      command === 'ruby' ? result(0, '/home/user/.gem\n') : result(0, 'fastlane 2.228.0\n');
    expect(
      await ensureFastlane(['2.228.0'], {
        env: { PATH: bin, GITHUB_PATH: '/tmp/path' },
        io,
        runCommand,
        appendFile: (file: string, value: string) => appends.push(`${file}:${value}`),
        sleep: async () => {},
      }),
    ).toBe(0);
    expect(appends).toEqual(['/tmp/path:/home/user/.gem/bin\n']);
    expect(io.stdout.write).toHaveBeenCalledWith('✅ fastlane 2.228.0 already installed\n');
  });

  test('installs the requested version and reports mismatches and missing arguments', async () => {
    const io = createIo();
    const runCommand = (command: string, args: string[]) => {
      if (command === 'ruby') return result(0, '/home/user/.gem');
      if (command === 'gem' && args[0] === 'install') {
        writeFileSync(join(bin, 'fastlane'), '', { mode: 0o755 });
        return result();
      }
      return result(0, 'fastlane 9.9.9\n');
    };
    expect(
      await ensureFastlane(['2.0.0'], {
        env: { PATH: bin },
        io,
        runCommand,
        sleep: async () => {},
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith(expect.stringContaining('version mismatch'));
    expect(await ensureFastlane([], { io })).toBe(1);
  });

  test('returns Ruby and gem installation failures', async () => {
    expect(await ensureFastlane(['2'], { runCommand: () => result(5), io: createIo() })).toBe(5);
    const io = createIo();
    expect(
      await ensureFastlane(['2'], {
        env: { PATH: bin },
        io,
        commandExists: (command: string) => command !== 'fastlane',
        runCommand: (command: string, args: string[]) =>
          command === 'ruby'
            ? result(0, '/home/user/.gem')
            : command === 'gem' && args[0] === 'install'
              ? result(7)
              : result(),
      }),
    ).toBe(7);
  });

  test('handles command lookup misses, PATH updates, and post-install verification', async () => {
    const io = createIo();
    const targetBin = join(root, '.gem', 'bin');
    writeFileSync(join(bin, 'fastlane'), '', { mode: 0o755 });
    const commands: string[] = [];
    const runCommand = (command: string, args: string[]) => {
      commands.push([command, ...args].join(' '));
      if (command === 'ruby') return result(0, join(root, '.gem'));
      if (command === 'fastlane' && args[0] === '--version') return result(0, 'fastlane 2.228.0\n');
      return result();
    };
    expect(
      await ensureFastlane(['2.228.0'], {
        env: { PATH: `${join(root, 'missing')}:${bin}:${targetBin}` },
        io,
        runCommand,
        sleep: async () => {},
      }),
    ).toBe(0);
    expect(commands).toEqual([
      'ruby -e require "rubygems"; print Gem.user_dir',
      'fastlane --version',
      'fastlane --version',
    ]);
    expect(io.stdout.write).toHaveBeenCalledWith('✅ fastlane 2.228.0 already installed\n');
  });

  test('reports missing versions, command failures, and caught setup errors', async () => {
    const io = createIo();
    expect(
      await ensureFastlane(['2.0.0'], {
        env: { PATH: '' },
        io,
        runCommand: (command: string, args: string[]) =>
          command === 'ruby'
            ? result(0, '/home/user/.gem')
            : command === 'gem' && args[0] === 'install'
              ? result()
              : result(0, 'fastlane version unavailable'),
        sleep: async () => {},
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith('❌ Fastlane not found in PATH\n');

    const noVersionBin = join(root, 'no-version-bin');
    mkdirSync(noVersionBin);
    writeFileSync(join(noVersionBin, 'fastlane'), '', { mode: 0o755 });
    const noVersionIo = createIo();
    expect(
      await ensureFastlane(['2.0.0'], {
        env: { PATH: noVersionBin },
        io: noVersionIo,
        runCommand: (command: string) =>
          command === 'ruby' ? result(0, '/home/user/.gem') : result(0, 'Fastlane installed'),
        sleep: async () => {},
      }),
    ).toBe(1);
    expect(noVersionIo.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Could not determine fastlane version'),
    );

    const error = Object.assign(new Error('ruby unavailable'), { code: 'ENOENT' });
    const failedIo = createIo();
    expect(
      await ensureFastlane(['2.0.0'], {
        io: failedIo,
        runCommand: () => ({ status: null, error }),
      }),
    ).toBe(127);
    expect(failedIo.stderr.write).toHaveBeenCalledWith('ruby unavailable\n');
    expect(
      await fastlaneMain(['2.0.0'], {
        io,
        runCommand: () => {
          throw new Error('unexpected spawn error');
        },
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith('unexpected spawn error\n');
  });

  test('installs and verifies the requested version using the default delay', async () => {
    const io = createIo();
    const gemBin = join(root, '.gem', 'bin');
    mkdirSync(gemBin, { recursive: true });
    const commands: string[] = [];
    expect(
      await ensureFastlane(['2.228.0'], {
        env: { PATH: bin },
        io,
        runCommand: (command: string, args: string[]) => {
          commands.push([command, ...args].join(' '));
          if (command === 'ruby') return result(0, join(root, '.gem'));
          if (command === 'fastlane') return result(0, 'fastlane 2.228.0\n');
          if (command === 'gem' && args[0] === 'install') {
            writeFileSync(join(gemBin, 'fastlane'), '', { mode: 0o755 });
          }
          return result();
        },
      }),
    ).toBe(0);
    expect(commands).toContain('gem install -N -q --user-install fastlane -v 2.228.0');
    expect(io.stdout.write).toHaveBeenCalledWith(
      '✅ Fastlane 2.228.0 successfully installed and verified\n',
    );
  });

  test('covers optional fastlane outputs and default arguments', async () => {
    const binWithFastlane = join(root, 'current-fastlane-bin');
    mkdirSync(binWithFastlane);
    writeFileSync(join(binWithFastlane, 'fastlane'), '', { mode: 0o755 });
    const currentError = Object.assign(new Error('fastlane unavailable'), { code: 'ENOENT' });
    expect(
      await ensureFastlane(['2.0.0'], {
        env: { PATH: binWithFastlane },
        io: createIo(),
        runCommand: (command: string) =>
          command === 'ruby' ? result(0, '/home/user/.gem') : { status: null, error: currentError },
        sleep: async () => {},
      }),
    ).toBe(127);

    const actualError = Object.assign(new Error('verification unavailable'), { code: 'EACCES' });
    const actualIo = createIo();
    let fastlaneCalls = 0;
    expect(
      await ensureFastlane(['2.0.0'], {
        env: { PATH: binWithFastlane },
        io: actualIo,
        runCommand: (command: string, args: string[]) =>
          command === 'ruby'
            ? result(0, '/home/user/.gem')
            : command === 'fastlane' && args[0] === '--version'
              ? fastlaneCalls++ === 0
                ? result(0, 'fastlane 2.0.0')
                : { status: null, error: actualError }
              : result(),
        sleep: async () => {},
      }),
    ).toBe(1);
    expect(actualIo.stderr.write).toHaveBeenCalledWith('verification unavailable\n');

    expect(await ensureFastlane([])).toBe(1);
    expect(
      await ensureFastlane(undefined as never, {
        io: createIo(),
        runCommand: () => result(5),
      }),
    ).toBe(5);
    expect(
      await fastlaneMain(['2.0.0'], {
        runCommand: () => {
          throw new Error('missing process IO');
        },
      }),
    ).toBe(1);
  });

  test('reports fastlane command output and missing PATH defaults', async () => {
    const io = createIo();
    const currentBin = join(root, 'current-bin');
    mkdirSync(currentBin);
    writeFileSync(join(currentBin, 'fastlane'), '', { mode: 0o755 });
    const fastlaneError = Object.assign(new Error('version failed'), { code: 'EACCES' });
    expect(
      await ensureFastlane(['2.0.0'], {
        env: { PATH: currentBin },
        io,
        runCommand: (command: string) =>
          command === 'ruby'
            ? { status: 0, stderr: 'ruby notice\n' }
            : { status: 3, stderr: 'fastlane stderr\n', error: fastlaneError },
      }),
    ).toBe(3);
    expect(io.stderr.write).toHaveBeenCalledWith('ruby notice\n');
    expect(io.stderr.write).toHaveBeenCalledWith('fastlane stderr\n');
    expect(io.stderr.write).toHaveBeenCalledWith('version failed\n');

    const missingPathIo = createIo();
    expect(
      await ensureFastlane(['2.0.0'], {
        env: { PATH: undefined },
        io: missingPathIo,
        runCommand: (command: string, args: string[]) => {
          if (command === 'ruby') return { status: 0 };
          if (command === 'gem' && args[0] === 'install') return result();
          return { status: 0 };
        },
        sleep: async () => {},
      }),
    ).toBe(1);
  });
});

describe('Maestro setup', () => {
  let root: string;
  let bin: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'maestro-setup-'));
    bin = join(root, 'bin');
    mkdirSync(bin);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test('skips an installed CLI and reports when neither downloader exists', () => {
    writeFileSync(join(bin, 'maestro'), '', { mode: 0o755 });
    const io = createIo();
    expect(
      setupMaestro(['2.0'], {
        env: { PATH: bin },
        io,
        runCommand: () => result(0, '1.2.3\n'),
      }),
    ).toBe(0);
    expect(io.stdout.write).toHaveBeenCalledWith('✅ Maestro already installed: 1.2.3\n');

    rmSync(join(bin, 'maestro'));
    const missing = createIo();
    expect(setupMaestro([], { env: { PATH: bin }, io: missing })).toBe(1);
    expect(missing.stderr.write).toHaveBeenCalledWith(
      '❌ curl or wget required to install Maestro\n',
    );
  });

  test('runs the installer with the requested version and appends its bin directory', () => {
    const io = createIo();
    const appends: string[] = [];
    writeFileSync(join(bin, 'curl'), '', { mode: 0o755 });
    const runCommand = (command: string) => {
      if (command === 'curl') return result(0, 'installer-source');
      if (command === 'bash') {
        writeFileSync(join(bin, 'maestro'), '', { mode: 0o755 });
        return result(0, 'Installer output\n');
      }
      return result(0, 'Maestro 2.0.0\n');
    };
    expect(
      setupMaestro(['2.0.0'], {
        env: { PATH: bin, HOME: root, GITHUB_PATH: '/tmp/github-path' },
        io,
        runCommand,
        appendFile: (file: string, value: string) => appends.push(`${file}:${value}`),
      }),
    ).toBe(0);
    expect(appends).toEqual([`/tmp/github-path:${root}/.maestro/bin\n`]);
    expect(io.stdout.write).toHaveBeenCalledWith(
      '✅ Maestro installed successfully: Maestro 2.0.0\n',
    );
  });

  test('returns installer failures and supports the wget fallback', () => {
    writeFileSync(join(bin, 'wget'), '', { mode: 0o755 });
    const failed = createIo();
    expect(
      setupMaestro([], {
        env: { PATH: bin },
        io: failed,
        runCommand: (command: string) => (command === 'wget' ? result(0, 'script') : result(8)),
      }),
    ).toBe(8);
    expect(failed.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('Installing Maestro CLI'),
    );
  });

  test('reports download errors and unsuccessful or missing installations', () => {
    writeFileSync(join(bin, 'curl'), '', { mode: 0o755 });
    const downloadIo = createIo();
    const missing = Object.assign(new Error('curl unavailable'), { code: 'ENOENT' });
    expect(
      setupMaestro([], {
        env: { PATH: bin },
        io: downloadIo,
        runCommand: (command: string) =>
          command === 'curl' ? { status: null, error: missing } : result(),
      }),
    ).toBe(127);
    expect(downloadIo.stderr.write).toHaveBeenCalledWith('curl unavailable\n');

    const installIo = createIo();
    expect(
      setupMaestro([], {
        env: { PATH: bin },
        io: installIo,
        runCommand: (command: string) =>
          command === 'curl' ? result() : result(9, '', 'install failed\n'),
      }),
    ).toBe(9);
    expect(installIo.stderr.write).toHaveBeenCalledWith('install failed\n');

    const noBinIo = createIo();
    expect(
      setupMaestro([], {
        env: { PATH: bin },
        io: noBinIo,
        runCommand: (command: string) => (command === 'curl' ? result() : result()),
      }),
    ).toBe(1);
    expect(noBinIo.stderr.write).toHaveBeenCalledWith('❌ Maestro installation failed\n');
    expect(
      maestroMain([], {
        env: { PATH: bin },
        io: noBinIo,
        runCommand: () => {
          throw new Error('spawn failed');
        },
      }),
    ).toBe(1);
    expect(noBinIo.stderr.write).toHaveBeenCalledWith('spawn failed\n');
  });

  test('uses the fallback argument and reports non-ENOENT installer errors', () => {
    writeFileSync(join(bin, 'curl'), '', { mode: 0o755 });
    const io = createIo();
    const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    expect(
      setupMaestro(undefined as never, {
        env: { PATH: `${join(root, 'missing')}:${bin}` },
        io,
        runCommand: (command: string) =>
          command === 'curl' ? result() : { status: null, error: denied },
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith('permission denied\n');
    expect(maestroMain(undefined as never, { env: { PATH: '' }, io })).toBe(1);
  });
});

describe('Expo dependency verification', () => {
  test('prints version checks and ignores their failures before the strict check', () => {
    const io = createIo();
    const commands: string[] = [];
    expect(
      verifyExpoDependencies({
        io,
        runCommand: (command: string, args: string[]) => {
          commands.push([command, ...args].join(' '));
          return commands.length < 4 ? result(5, 'version output\n') : result();
        },
      }),
    ).toBe(0);
    expect(commands).toHaveLength(4);
    expect(io.stdout.write).toHaveBeenCalledWith('version output\n');
  });

  test('reports dependency drift and returns failure', () => {
    const io = createIo();
    expect(
      verifyExpoDependencies({
        io,
        runCommand: (command: string, args: string[]) =>
          args[1] === 'install' ? result(9, '', 'drift\n') : result(),
      }),
    ).toBe(1);
    expect(io.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('dependency drift detected'),
    );
  });

  test('prints spawn errors from ignored checks and maps a missing strict command to 127', () => {
    const io = createIo();
    const missing = Object.assign(new Error('npx missing'), { code: 'ENOENT' });
    expect(
      verifyExpoDependencies({
        io,
        runCommand: (_command: string, args: string[]) =>
          args[1] === 'install'
            ? { status: null, error: missing }
            : result(1, '', 'version warning\n'),
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith('version warning\n');
    expect(io.stderr.write).toHaveBeenCalledWith('npx missing\n');
    expect(
      verifyExpoMain({
        io,
        runCommand: () => {
          throw new Error('verification failed');
        },
      }),
    ).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith('verification failed\n');
  });

  test('uses default commands safely and maps non-ENOENT spawn errors', () => {
    const io = createIo();
    const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    expect(
      verifyExpoDependencies({
        env: { PATH: '' },
        cwd: '/tmp',
        io,
        runCommand: (_command: string, args: string[]) =>
          args[1] === 'install' ? { status: null, error: denied } : result(),
      }),
    ).toBe(1);

    const oldPath = process.env.PATH;
    process.env.PATH = '';
    try {
      expect(verifyExpoMain()).toBe(1);
      expect(verifyExpoDependencies()).toBe(1);
    } finally {
      if (oldPath === undefined) delete process.env.PATH;
      else process.env.PATH = oldPath;
    }
  });
});

describe('local dependency setup', () => {
  let root: string;
  let home: string;
  let bin: string;
  let miseConfig: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'local-deps-'));
    home = join(root, 'home');
    bin = join(root, 'bin');
    mkdirSync(home);
    mkdirSync(bin);
    miseConfig = join(root, '.mise.toml');
    writeFileSync(miseConfig, 'min_version = "2026.1.0"\n');
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test('skips installed dependencies, trusts mise, and activates zsh', () => {
    writeFileSync(join(bin, 'brew'), '', { mode: 0o755 });
    const io = createIo();
    const commands: string[] = [];
    const runCommand = (command: string, args: string[]) => {
      commands.push([command, ...args].join(' '));
      if (args[0] === 'list' && args.at(-1) === 'fastlane') return result(0, 'fastlane 2.228.0\n');
      if (args[0] === 'list' && args.at(-1) === 'maestro') return result(0, 'maestro 2.0.6\n');
      return result();
    };
    const options = {
      env: { HOME: home, PATH: bin, SHELL: '/bin/zsh' },
      cwd: root,
      miseConfig,
      io,
      runCommand,
    };
    expect(setupLocalDependencies(options)).toBe(0);
    expect(commands).toContain('mise trust');
    expect(commands).toContain('mise install');
    expect(readFileSync(join(home, '.zshrc'), 'utf8')).toContain('mise activate zsh');
    expect(setupLocalDependencies(options)).toBe(0);
    expect(io.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('activation already present'),
    );
    expect(io.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Next step: npm ci'));
  });

  test('installs missing dependencies with fallback and stops on mise failure', () => {
    const io = createIo();
    const commands: string[] = [];
    writeFileSync(join(home, '.bashrc'), 'eval "$(mise activate bash)"\n');
    expect(
      setupLocalDependencies({
        env: { HOME: home, PATH: bin, SHELL: '/bin/bash' },
        cwd: root,
        miseConfig,
        io,
        runCommand: (command: string, args: string[]) => {
          commands.push([command, ...args].join(' '));
          if (args[0] === 'list') return result(0, '');
          if (args[0] === 'install' && args[1]?.startsWith('fastlane@')) return result(8);
          if (args[0] === 'trust') return result(6);
          return result();
        },
        commandExists: () => true,
      }),
    ).toBe(6);
    expect(commands).toContain('brew install fastlane');
    expect(commands).toContain('brew install --cask maestro');
    expect(commands).toContain('mise trust');
    expect(commands).not.toContain('mise install');
  });

  test('requires Homebrew and propagates the mise install failure', () => {
    const io = createIo();
    expect(
      setupLocalDependencies({
        env: { HOME: home },
        cwd: root,
        miseConfig,
        io,
        commandExists: () => false,
      }),
    ).toBe(1);
    expect(io.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Homebrew is required'));

    const installIo = createIo();
    expect(
      setupLocalDependencies({
        env: { HOME: home, PATH: bin },
        cwd: root,
        miseConfig,
        io: installIo,
        commandExists: () => true,
        runCommand: (command: string, args: string[]) => {
          if (args[0] === 'list' && args.at(-1) === 'fastlane')
            return result(0, 'fastlane 2.228.0');
          if (args[0] === 'list' && args.at(-1) === 'maestro') return result(0, 'maestro 2.0.6');
          if (command === 'mise' && args[0] === 'install') return result(11);
          return result();
        },
      }),
    ).toBe(11);
  });

  test('reports command lookup and config failures and covers command output', () => {
    const io = createIo();
    expect(localDependenciesMain({ commandExists: () => false, miseConfig, io })).toBe(1);

    const badConfig = join(root, 'bad-mise.toml');
    writeFileSync(badConfig, 'node = "22"\n');
    const configIo = createIo();
    expect(localDependenciesMain({ miseConfig: badConfig, io: configIo })).toBe(1);
    expect(configIo.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Unable to read min_version'),
    );

    const noBrewIo = createIo();
    writeFileSync(join(bin, 'brew'), '', { mode: 0o755 });
    expect(
      setupLocalDependencies({
        env: { HOME: home, PATH: `${join(root, 'missing')}:${bin}` },
        cwd: root,
        miseConfig,
        io: noBrewIo,
        runCommand: (command: string, args: string[]) => {
          if (command === 'brew' && args[0] === 'list' && args.at(-1) === 'fastlane')
            return result(0, 'fastlane 2.228.0');
          if (command === 'brew' && args[0] === 'list' && args.at(-1) === 'maestro')
            return result(0, 'maestro 2.0.6');
          return result(0, 'tool output\n', 'tool warning\n');
        },
      }),
    ).toBe(0);
    expect(noBrewIo.stdout.write).toHaveBeenCalledWith('tool output\n');
    expect(noBrewIo.stderr.write).toHaveBeenCalledWith('tool warning\n');
  });

  test('installs missing Homebrew packages and handles Brew spawn errors', () => {
    const io = createIo();
    const commands: string[] = [];
    expect(
      setupLocalDependencies({
        env: { HOME: home, PATH: bin, SHELL: '/bin/zsh' },
        cwd: root,
        miseConfig,
        io,
        commandExists: () => true,
        runCommand: (command: string, args: string[]) => {
          commands.push([command, ...args].join(' '));
          if (command === 'brew' && args[0] === 'list' && args.at(-1) === 'fastlane')
            return result(0, '');
          if (command === 'brew' && args[0] === 'list' && args.at(-1) === 'maestro')
            return result(1);
          if (command === 'brew' && args[0] === 'list') return result(1);
          return result(0, 'tool output\n', 'tool warning\n');
        },
      }),
    ).toBe(0);
    expect(commands).toContain('brew install watchman');
    expect(commands).toContain('brew install mise');
    expect(commands).toContain('brew install fastlane@2.228.0');
    expect(commands).toContain('brew install --cask maestro');

    const denied = Object.assign(new Error('brew denied'), { code: 'EACCES' });
    expect(
      setupLocalDependencies({
        env: { HOME: home, PATH: bin },
        cwd: root,
        miseConfig,
        io: createIo(),
        commandExists: () => true,
        runCommand: (_command: string, args: string[]) =>
          args[0] === 'list' && args.at(-1) === 'fastlane'
            ? { status: null, error: denied }
            : result(),
      }),
    ).toBe(1);

    const failedInstall = Object.assign(new Error('brew missing'), { code: 'ENOENT' });
    const failedIo = createIo();
    expect(
      setupLocalDependencies({
        env: { HOME: home, PATH: bin },
        cwd: root,
        miseConfig,
        io: failedIo,
        commandExists: () => true,
        runCommand: (_command: string, args: string[]) =>
          args[0] === 'list' && args.at(-1) === 'watchman'
            ? result(1)
            : { status: null, error: failedInstall },
      }),
    ).toBe(127);
    expect(failedIo.stderr.write).toHaveBeenCalledWith('brew missing\n');
  });

  test('returns package install failures from mise, fastlane fallback, and Maestro', () => {
    const common = {
      env: { HOME: home, PATH: bin },
      cwd: root,
      miseConfig,
      io: createIo(),
      commandExists: () => true,
    };
    expect(
      setupLocalDependencies({
        ...common,
        runCommand: (_command: string, args: string[]) =>
          args[0] === 'list' && args.at(-1) === 'mise'
            ? result(1)
            : args[0] === 'install' && args[1] === 'mise'
              ? result(13)
              : result(0),
      }),
    ).toBe(13);

    expect(
      setupLocalDependencies({
        ...common,
        runCommand: (_command: string, args: string[]) => {
          if (args[0] === 'list' && args.at(-1) === 'fastlane') return { status: 0 };
          if (args[0] === 'install' && args[1]?.startsWith('fastlane@')) return result(8);
          if (args[0] === 'install' && args[1] === 'fastlane') return result(12);
          return result(0);
        },
      }),
    ).toBe(12);

    expect(
      setupLocalDependencies({
        ...common,
        runCommand: (_command: string, args: string[]) => {
          if (args[0] === 'list' && args.at(-1) === 'fastlane')
            return result(0, 'fastlane 2.228.0');
          if (args[0] === 'list' && args.at(-1) === 'maestro') return { status: 1 };
          if (args[0] === 'install' && args[1] === '--cask') return result(14);
          return result(0);
        },
      }),
    ).toBe(14);
  });
});
