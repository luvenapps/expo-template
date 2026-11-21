import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptPath = path.resolve(
  process.cwd(),
  'scripts/sync-template-source.mjs',
);

const templateCiFiles = [
  '__tests__/scripts/android_run_e2e.test.ts',
  '__tests__/scripts/compute_fingerprint.test.ts',
  '__tests__/scripts/ios_boot_simulator.test.ts',
  '__tests__/scripts/ios_install_app.test.ts',
  '__tests__/scripts/ios_run_e2e.test.ts',
  '__tests__/scripts/ios_simulator_arch.test.ts',
  '__tests__/scripts/template-ci-config.test.ts',
  '__tests__/scripts/template-postinstall.test.ts',
  '__tests__/scripts/validate_hermes_bundle.test.ts',
  '__tests__/scripts/with_timeout.test.ts',
];

const appTestSupportPath = '__tests__/helpers/test-support.ts';

function writeFile(root: string, relativePath: string, content: string) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('sync-template-source', () => {
  let root: string;
  let source: string;
  let target: string;
  let syncEnv: NodeJS.ProcessEnv;
  let remote: string;

  function git(directory: string, ...args: string[]) {
    const result = spawnSync('git', ['-C', directory, ...args], {
      encoding: 'utf8',
    });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-source-sync-'));
    source = path.join(root, 'source');
    target = path.join(root, 'target');
    fs.mkdirSync(source);
    fs.mkdirSync(target);

    writeFile(
      source,
      'package.json',
      JSON.stringify({
        name: 'betterhabits',
        scripts: { postinstall: 'source setup' },
      }),
    );
    writeFile(
      source,
      'package-lock.json',
      JSON.stringify({
        name: 'betterhabits',
        lockfileVersion: 3,
        packages: { '': { name: 'betterhabits' } },
      }),
    );
    writeFile(source, '.mise.ci.toml', '[env]\nCI_TOOL_VERSION = "1.2.3"\n');
    writeFile(source, appTestSupportPath, 'source app test support\n');
    writeFile(source, 'commitlint.config.js', 'source app commitlint\n');
    writeFile(source, 'drizzle.config.postgres.ts', 'source postgres config\n');
    writeFile(source, 'drizzle.config.sqlite.ts', 'source sqlite config\n');
    writeFile(source, 'tamagui.build.ts', 'source Tamagui build config\n');
    writeFile(source, 'index.js', 'source app entry\n');
    writeFile(source, 'credentials.json', 'source credential data\n');
    fs.mkdirSync(path.join(source, 'assets'), { recursive: true });
    fs.writeFileSync(
      path.join(source, 'assets/icon.png'),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]),
    );
    writeFile(
      source,
      'app.config.ts',
      [
        "const baseBundleId = 'com.luvenapps.betterhabits';",
        "name: isPreview ? 'betterhabits (Preview)' : 'betterhabits',",
        "slug: 'betterhabits',",
        "scheme: 'betterhabits',",
        "data: [{ scheme: 'betterhabits' }],",
        "appleTeamId: 'HWJZHVS443',",
        "eas: { projectId: 'source-project' },",
        "updates: { url: 'https://u.expo.dev/source-project' },",
      ].join('\n'),
    );
    writeFile(
      source,
      'src/config/domain.config.ts',
      [
        "database: 'betterhabits.db',",
        "syncTask: 'betterhabits-sync-task',",
        "tableName: 'habits',",
        "entriesTableName: 'habit_entries',",
        "foreignKey: 'habitId',",
      ].join('\n'),
    );
    writeFile(source, '.github/workflows/ci.yml', 'name: CI\n');
    writeFile(
      source,
      '.github/workflows/template-sync.yml',
      'source version\n',
    );
    writeFile(
      source,
      '.github/runner/register-runner.sh',
      'credential setup\n',
    );
    writeFile(source, '.husky/pre-commit', 'npm run lint\n');
    writeFile(
      source,
      '.maestro/flows/smoke.yaml',
      'appId: com.luvenapps.betterhabits\n',
    );
    writeFile(source, '.gitignore', 'node_modules\n');
    writeFile(source, 'renovate.json', '{"extends":["config:recommended"]}\n');
    writeFile(
      source,
      'scripts/troubleshoot.mjs',
      [
        '/**',
        ' * - Self-hosted GitHub Actions runner',
        ' */',
        "import os from 'node:os';",
        'function check() {',
        '  // Before optional runner setup',
        '  // Self-hosted GitHub Actions runner (optional)',
        '  os.platform();',
        '  // Expo peer deps',
        '  return true;',
        '}',
      ].join('\n'),
    );
    writeFile(source, 'README.md', 'Source README\n\n---\n');
    writeFile(source, 'scripts/postinstall.mjs', 'source bootstrap\n');
    writeFile(source, 'AGENTS.md', 'Source instructions\n');
    writeFile(source, 'CLAUDE.md', '@AGENTS.md\n');
    writeFile(source, '.env.local', 'SECRET=value\n');
    writeFile(
      source,
      '__tests__/scripts/sync-template-source.test.ts',
      'source version\n',
    );
    writeFile(
      source,
      '__tests__/scripts/sync-template-source.test.js',
      'legacy source test\n',
    );
    writeFile(source, 'docs/roadmap.md', 'Product roadmap\n');
    writeFile(
      source,
      '__tests__/app.config.test.ts',
      [
        "slug: 'betterhabits',",
        "it('keeps slug as betterhabits in preview mode', () => {});",
        "expect(config.name).toBe('betterhabits (Preview)');",
        "it('keeps slug as betterhabits in production mode', () => {});",
        "expect(config.slug).toBe('betterhabits');",
      ].join('\n'),
    );
    writeFile(
      source,
      '__tests__/app/(tabs)/settings/terms.test.tsx',
      'expect(getByText(/Le damos la bienvenida a Better Habits/)).toBeDefined();\n',
    );
    writeFile(
      source,
      '__tests__/config/tamagui-build.test.ts',
      "process.env.METRO_CACHE_PATH = '/tmp/betterhabits-metro-test';\n",
    );
    writeFile(
      source,
      'docs/architecture.md',
      [
        '- [Roadmap](./roadmap.md) - Current status and upcoming milestones',
        'Welcome to Better Habits at betterhabits://settings.',
      ].join('\n'),
    );
    writeFile(
      source,
      'docs/app-build-size.md',
      'Keeping these reports up to date means the Stage 7 database work—and eventual habit UI—won’t surprise us later.\n',
    );

    // Exercise both deletion (missing upstream) and replacement (same upstream path).
    templateCiFiles.forEach((file, index) => {
      writeFile(target, file, 'template CI coverage\n');
      if (index % 2 === 0) writeFile(source, file, 'source replacement\n');
    });

    writeFile(target, 'README.md', 'Template repository README\n');
    writeFile(target, 'package.json', '{"name":"expo-template-tools"}\n');
    writeFile(target, 'package-lock.json', '{"name":"expo-template-tools"}\n');
    writeFile(target, 'commitlint.config.js', 'root commitlint\n');
    writeFile(target, 'LICENSE', 'Root repository license\n');
    writeFile(target, 'credentials.json', 'root credential data\n');
    writeFile(
      target,
      'renovate.json',
      '{"enabledManagers":["github-actions"]}\n',
    );
    writeFile(target, 'AGENTS.md', 'Template instructions\n');
    writeFile(target, 'CLAUDE.md', 'Template Claude instructions\n');
    writeFile(target, 'template-sync/README.md', 'Old app README\n');
    writeFile(target, 'template-sync/_AGENTS.md', 'Old source instructions\n');
    writeFile(
      target,
      'template-sync/_CLAUDE.md',
      'Old source Claude instructions\n',
    );
    writeFile(target, 'template-sync/_renovate.json', 'old app renovate\n');
    writeFile(target, 'template-sync/_mise.ci.toml', 'old app CI config\n');
    writeFile(target, 'template-sync/_env.example', 'template app env\n');
    writeFile(target, 'template-sync/LICENSE', 'Template app license\n');
    writeFile(
      target,
      'template-sync/scripts/postinstall.mjs',
      'template app bootstrap\n',
    );
    writeFile(
      target,
      '__tests__/scripts/sync-template-source.test.ts',
      'template sync test\n',
    );
    writeFile(
      target,
      '.github/workflows/ci-quality.yml',
      'template quality workflow\n',
    );
    writeFile(
      target,
      '.github/workflows/template-sync.yml',
      'template workflow\n',
    );
    writeFile(
      target,
      'template-sync/_github/runner/register-runner.sh',
      'old runner setup\n',
    );
    writeFile(target, 'template-sync/scripts/old-managed-script.js', 'stale\n');
    writeFile(
      target,
      'scripts/old-managed-script.js',
      'root template script\n',
    );
    writeFile(target, 'template-sync/.mcp.json', 'stale app MCP config\n');

    for (const checkout of [source, target]) {
      git(checkout, 'init', '-q', '-b', 'main');
      git(checkout, 'config', 'user.name', 'Sync fixture');
      git(checkout, 'config', 'user.email', 'sync@example.com');
      git(checkout, 'config', 'commit.gpgsign', 'false');
      git(checkout, 'config', 'core.hooksPath', '/dev/null');
      git(checkout, 'add', '-A');
      git(checkout, 'commit', '-qm', 'Initial fixture');
    }
    const sourceRemote = path.join(root, 'source-remote.git');
    fs.mkdirSync(sourceRemote);
    git(sourceRemote, 'init', '--bare', '-q', '-b', 'main');
    git(source, 'remote', 'add', 'origin', sourceRemote);
    git(source, 'push', '-q', 'origin', 'main');
    remote = path.join(root, 'remote.git');
    fs.mkdirSync(remote);
    git(remote, 'init', '--bare', '-q', '-b', 'main');
    git(target, 'remote', 'add', 'origin', remote);
    git(target, 'push', '-q', 'origin', 'main');
    const bin = path.join(root, 'bin');
    writeFile(
      bin,
      'gh',
      '#!/bin/sh\nif [ "$1" = "pr" ]; then echo "https://github.com/example/template/pull/1"; fi\n',
    );
    fs.chmodSync(path.join(bin, 'gh'), 0o755);
    syncEnv = {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
    };
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('syncs pnpm lockfiles into the app payload with template identity', () => {
    fs.unlinkSync(path.join(source, 'package-lock.json'));
    const workspaceConfig =
      [
        'overrides:',
        '  react-server-dom-webpack: 19.3.1',
        '  react-dom: 19.3.0',
        '  react: 19.3.0',
        '  react-test-renderer: 19.3.0',
        '  react-native-web: ^0.21.4',
      ].join('\n') + '\n';
    writeFile(source, 'pnpm-workspace.yaml', workspaceConfig);
    writeFile(
      source,
      'pnpm-lock.yaml',
      [
        'name: betterhabits',
        "lockfileVersion: '9.0'",
        'settings:',
        '  autoInstallPeers: true',
        'overrides:',
        '  react-server-dom-webpack: 19.3.1',
        '  react-dom: 19.3.0',
        '  react: 19.3.0',
        '  react-test-renderer: 19.3.0',
        '  react-native-web: ^0.21.4',
        'importers:',
        '  .: {}',
      ].join('\n') + '\n',
    );
    git(source, 'add', '-A');
    git(source, 'commit', '-qm', 'Switch source fixture to pnpm');
    git(source, 'push', '-q', 'origin', 'main');

    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        '--source-dir',
        source,
        '--target-dir',
        target,
        '--source-repository',
        'luvenapps/betterhabits',
        '--yes',
      ],
      { encoding: 'utf8', env: syncEnv },
    );

    if (result.status !== 0) {
      throw new Error([result.stdout, result.stderr].join('\n'));
    }
    expect(result.status).toBe(0);
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/pnpm-lock.yaml'),
        'utf8',
      ),
    ).toContain('name: template-starter');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/pnpm-workspace.yaml'),
        'utf8',
      ),
    ).toBe(workspaceConfig);
    expect(
      fs.existsSync(path.join(target, 'template-sync/package-lock.json')),
    ).toBe(false);
    const syncedPaths = git(
      target,
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      'HEAD',
    )
      .split('\n')
      .filter(Boolean);
    expect(syncedPaths.every((file) => file.startsWith('template-sync/'))).toBe(
      true,
    );
  });

  test('copies reusable files, adapts app identity, and preserves template-owned setup', () => {
    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        '--source-dir',
        source,
        '--target-dir',
        target,
        '--source-repository',
        'luvenapps/betterhabits',
        '--yes',
      ],
      { encoding: 'utf8', env: syncEnv },
    );

    if (result.status !== 0) {
      throw new Error([result.stdout, result.stderr].join('\n'));
    }
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    const syncedPaths = git(
      target,
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      'HEAD',
    )
      .split('\n')
      .filter(Boolean);
    expect(syncedPaths.length).toBeGreaterThan(0);
    expect(syncedPaths.every((file) => file.startsWith('template-sync/'))).toBe(
      true,
    );
    expect(
      fs.readFileSync(path.join(target, 'template-sync/package.json'), 'utf8'),
    ).toContain('"name": "template-starter"');
    expect(
      fs.readFileSync(path.join(target, 'template-sync/package.json'), 'utf8'),
    ).toContain('"postinstall": "node scripts/postinstall.mjs"');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/package-lock.json'),
        'utf8',
      ),
    ).toContain('"name": "template-starter"');
    expect(
      fs.readFileSync(path.join(target, 'template-sync/_mise.ci.toml'), 'utf8'),
    ).toBe('[env]\nCI_TOOL_VERSION = "1.2.3"\n');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync', appTestSupportPath),
        'utf8',
      ),
    ).toBe('source app test support\n');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/commitlint.config.js'),
        'utf8',
      ),
    ).toBe('source app commitlint\n');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/drizzle.config.postgres.ts'),
        'utf8',
      ),
    ).toBe('source postgres config\n');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/drizzle.config.sqlite.ts'),
        'utf8',
      ),
    ).toBe('source sqlite config\n');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/tamagui.build.ts'),
        'utf8',
      ),
    ).toBe('source Tamagui build config\n');
    expect(
      fs.readFileSync(path.join(target, 'template-sync/index.js'), 'utf8'),
    ).toBe('source app entry\n');
    expect(
      fs.readFileSync(path.join(target, 'template-sync/assets/icon.png')),
    ).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]));
    expect(
      fs.readFileSync(path.join(target, 'template-sync/app.config.ts'), 'utf8'),
    ).toContain("name: isPreview ? '__APP_NAME__ (Preview)' : '__APP_NAME__',");
    expect(
      fs.readFileSync(path.join(target, 'template-sync/app.config.ts'), 'utf8'),
    ).toContain("scheme: '__APP_SLUG__',");
    expect(
      fs.readFileSync(path.join(target, 'template-sync/app.config.ts'), 'utf8'),
    ).toContain("data: [{ scheme: '__APP_SLUG__' }],");
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/src/config/domain.config.ts'),
        'utf8',
      ),
    ).toContain("tableName: '__APP_NAME__',");
    const troubleshoot = fs.readFileSync(
      path.join(target, 'template-sync/scripts/troubleshoot.mjs'),
      'utf8',
    );
    expect(troubleshoot).not.toContain('Self-hosted GitHub Actions runner');
    expect(troubleshoot).not.toContain("import os from 'node:os';");
    expect(troubleshoot).toContain('  // Expo peer deps');
    expect(troubleshoot).not.toContain('\n\n\n  // Expo peer deps');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/__tests__/app.config.test.ts'),
        'utf8',
      ),
    ).toContain("expect(config.name).toBe('__APP_NAME__ (Preview)');");
    expect(
      fs.readFileSync(
        path.join(
          target,
          'template-sync/__tests__/app/(tabs)/settings/terms.test.tsx',
        ),
        'utf8',
      ),
    ).toContain('/Le damos la bienvenida a/');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/docs/architecture.md'),
        'utf8',
      ),
    ).not.toContain('roadmap.md');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/docs/architecture.md'),
        'utf8',
      ),
    ).toContain('Welcome to {{APP_NAME}} at {{APP_SLUG}}://settings.');
    expect(
      fs.readFileSync(
        path.join(
          target,
          'template-sync/__tests__/config/tamagui-build.test.ts',
        ),
        'utf8',
      ),
    ).toContain('template-metro-test');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/docs/app-build-size.md'),
        'utf8',
      ),
    ).toContain('helps spot size increases as the app grows.');
    expect(
      fs.existsSync(
        path.join(target, 'template-sync/.github/workflows/ci.yml'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(target, 'template-sync/_github/workflows/ci.yml'),
      ),
    ).toBe(true);
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/_renovate.json'),
        'utf8',
      ),
    ).toBe('{"extends":["config:recommended"]}\n');
    expect(fs.readFileSync(path.join(target, 'renovate.json'), 'utf8')).toBe(
      '{"enabledManagers":["github-actions"]}\n',
    );
    expect(
      fs.readFileSync(path.join(target, 'template-sync/_AGENTS.md'), 'utf8'),
    ).toBe('Source instructions\n');
    expect(
      fs.readFileSync(path.join(target, 'template-sync/_CLAUDE.md'), 'utf8'),
    ).toBe('@AGENTS.md\n');
    expect(
      fs.existsSync(path.join(target, '.github/workflows/template-sync.yml')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(target, 'template-sync/_husky/pre-commit')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(target, 'template-sync/.husky/pre-commit')),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(target, 'template-sync/_maestro/flows/smoke.yaml'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(target, 'template-sync/.maestro/flows/smoke.yaml'),
      ),
    ).toBe(false);
    expect(
      fs.readFileSync(
        path.join(target, '.github/workflows/ci-quality.yml'),
        'utf8',
      ),
    ).toBe('template quality workflow\n');
    expect(
      fs.existsSync(
        path.join(target, 'template-sync/_github/workflows/template-sync.yml'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(target, 'template-sync/_github/runner/register-runner.sh'),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(target, 'template-sync/scripts/old-managed-script.js'),
      ),
    ).toBe(false);
    expect(
      fs.readFileSync(
        path.join(target, 'scripts/old-managed-script.js'),
        'utf8',
      ),
    ).toBe('root template script\n');
    expect(fs.existsSync(path.join(target, 'template-sync/.mcp.json'))).toBe(
      false,
    );
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(target, 'template-sync/.template-sync-manifest.json'),
          'utf8',
        ),
      ).sources['luvenapps/betterhabits'].main,
    ).toBe(git(source, 'rev-parse', 'HEAD'));
    expect(
      fs.readFileSync(path.join(target, 'template-sync/README.md'), 'utf8'),
    ).toContain(
      'https://github.com/luvenapps/expo-template/tree/main/template-sync',
    );
    expect(
      fs.readFileSync(path.join(target, 'template-sync/README.md'), 'utf8'),
    ).toContain(
      'https://github.com/luvenapps/expo-template/blob/main/docs/template-refresh.md',
    );
    expect(fs.readFileSync(path.join(target, 'README.md'), 'utf8')).toBe(
      'Template repository README\n',
    );
    expect(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).toBe(
      '{"name":"expo-template-tools"}\n',
    );
    expect(
      fs.readFileSync(path.join(target, 'package-lock.json'), 'utf8'),
    ).toBe('{"name":"expo-template-tools"}\n');
    expect(
      fs.readFileSync(path.join(target, 'commitlint.config.js'), 'utf8'),
    ).toBe('root commitlint\n');
    expect(fs.readFileSync(path.join(target, 'LICENSE'), 'utf8')).toBe(
      'Root repository license\n',
    );
    expect(fs.readFileSync(path.join(target, 'credentials.json'), 'utf8')).toBe(
      'root credential data\n',
    );
    expect(
      fs.existsSync(path.join(target, 'template-sync/credentials.json')),
    ).toBe(false);
    expect(
      fs.readFileSync(path.join(target, 'template-sync/_env.example'), 'utf8'),
    ).toBe('template app env\n');
    expect(
      fs.readFileSync(path.join(target, 'template-sync/LICENSE'), 'utf8'),
    ).toBe('Template app license\n');
    expect(
      fs.readFileSync(
        path.join(target, 'template-sync/scripts/postinstall.mjs'),
        'utf8',
      ),
    ).toBe('template app bootstrap\n');
    expect(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8')).toBe(
      'Template instructions\n',
    );
    expect(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8')).toBe(
      'Template Claude instructions\n',
    );
    expect(
      fs.readFileSync(
        path.join(target, '__tests__/scripts/sync-template-source.test.ts'),
        'utf8',
      ),
    ).toBe('template sync test\n');
    expect(
      fs.existsSync(
        path.join(target, '__tests__/scripts/sync-template-source.test.js'),
      ),
    ).toBe(false);
    for (const file of templateCiFiles) {
      expect(fs.readFileSync(path.join(target, file), 'utf8')).toBe(
        'template CI coverage\n',
      );
    }
    expect(fs.existsSync(path.join(target, '.env.local'))).toBe(false);
    expect(
      fs.existsSync(path.join(target, 'template-sync/docs/roadmap.md')),
    ).toBe(false);

    // Once the sync lands on main, the same source revision must create nothing.
    git(
      remote,
      'update-ref',
      'refs/heads/main',
      git(target, 'rev-parse', 'HEAD'),
    );
    const before = git(
      target,
      'for-each-ref',
      '--format=%(refname)',
      'refs/heads',
    );
    const repeated = spawnSync(
      process.execPath,
      [
        scriptPath,
        '--source-dir',
        source,
        '--target-dir',
        target,
        '--source-repository',
        'luvenapps/betterhabits',
        '--yes',
      ],
      { encoding: 'utf8', env: syncEnv },
    );
    if (repeated.status !== 0) {
      throw new Error([repeated.stdout, repeated.stderr].join('\n'));
    }
    expect(repeated.status).toBe(0);
    expect(repeated.stdout).toContain('Nothing to update.');
    expect(repeated.stdout).not.toContain('update template-sync/README.md');
    expect(
      git(target, 'for-each-ref', '--format=%(refname)', 'refs/heads'),
    ).toBe(before);
  });

  test('previews fetched main even when the local source checkout has newer unpushed commits', () => {
    const remoteSha = git(source, 'rev-parse', 'HEAD');
    writeFile(source, 'README.md', 'Unpushed source content\n');
    git(source, 'add', 'README.md');
    git(source, 'commit', '-qm', 'Unpushed source edit');
    const localSha = git(source, 'rev-parse', 'HEAD');
    const before = git(source, 'worktree', 'list', '--porcelain');
    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        '--source-dir',
        source,
        '--target-dir',
        target,
        '--source-repository',
        'luvenapps/betterhabits',
        '--dry-run',
      ],
      { encoding: 'utf8', env: syncEnv },
    );
    if (result.status !== 0) {
      throw new Error([result.stdout, result.stderr].join('\n'));
    }
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`(${remoteSha})`);
    expect(result.stdout).not.toContain(localSha);
    expect(git(source, 'rev-parse', 'HEAD')).toBe(localSha);
    expect(git(source, 'worktree', 'list', '--porcelain')).toBe(before);
    expect(fs.readFileSync(path.join(target, 'README.md'), 'utf8')).toBe(
      'Template repository README\n',
    );
  });
});
