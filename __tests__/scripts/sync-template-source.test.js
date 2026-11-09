const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const scriptPath = path.resolve(process.cwd(), 'scripts/sync-template-source.mjs');

function writeFile(root, relativePath, content) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('sync-template-source', () => {
  let root;
  let source;
  let target;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-source-sync-'));
    source = path.join(root, 'source');
    target = path.join(root, 'target');
    fs.mkdirSync(source);
    fs.mkdirSync(target);

    writeFile(
      source,
      'package.json',
      JSON.stringify({ name: 'betterhabits', scripts: { postinstall: 'source setup' } }),
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
    writeFile(source, '.github/workflows/template-sync.yml', 'source version\n');
    writeFile(source, '.github/runner/register-runner.sh', 'credential setup\n');
    writeFile(source, '.husky/pre-commit', 'npm run lint\n');
    writeFile(source, '.maestro/flows/smoke.yaml', 'appId: com.luvenapps.betterhabits\n');
    writeFile(source, '.gitignore', 'node_modules\n');
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
    writeFile(source, 'README.md', 'Source README\n');
    writeFile(source, 'AGENTS.md', 'Source instructions\n');
    writeFile(source, '.env.local', 'SECRET=value\n');
    writeFile(source, '__tests__/scripts/sync-template-source.test.js', 'source version\n');
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

    writeFile(target, 'README.md', 'Template README\n');
    writeFile(target, 'AGENTS.md', 'Template instructions\n');
    writeFile(target, 'scripts/postinstall.js', 'template bootstrap\n');
    writeFile(target, '__tests__/scripts/sync-template-source.test.js', 'template sync test\n');
    writeFile(target, '.github/workflows/ci-quality.yml', 'template quality workflow\n');
    writeFile(target, '.github/workflows/template-sync.yml', 'template workflow\n');
    writeFile(target, '_github/runner/register-runner.sh', 'old runner setup\n');
    writeFile(target, 'scripts/old-managed-script.js', 'stale\n');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('copies reusable files, adapts app identity, and preserves template-owned setup', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--source-dir', source, '--target-dir', target],
      { encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).toContain(
      '"name": "template-starter"',
    );
    expect(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).toContain(
      '"postinstall": "node scripts/postinstall.js"',
    );
    expect(fs.readFileSync(path.join(target, 'app.config.ts'), 'utf8')).toContain(
      "name: isPreview ? '__APP_NAME__ (Preview)' : '__APP_NAME__',",
    );
    expect(fs.readFileSync(path.join(target, 'app.config.ts'), 'utf8')).toContain(
      "scheme: '__APP_SLUG__',",
    );
    expect(fs.readFileSync(path.join(target, 'app.config.ts'), 'utf8')).toContain(
      "data: [{ scheme: '__APP_SLUG__' }],",
    );
    expect(fs.readFileSync(path.join(target, 'src/config/domain.config.ts'), 'utf8')).toContain(
      "tableName: '__APP_NAME__',",
    );
    const troubleshoot = fs.readFileSync(path.join(target, 'scripts/troubleshoot.mjs'), 'utf8');
    expect(troubleshoot).not.toContain('Self-hosted GitHub Actions runner');
    expect(troubleshoot).not.toContain("import os from 'node:os';");
    expect(troubleshoot).toContain('  // Expo peer deps');
    expect(troubleshoot).not.toContain('\n\n\n  // Expo peer deps');
    expect(fs.readFileSync(path.join(target, '__tests__/app.config.test.ts'), 'utf8')).toContain(
      "expect(config.name).toBe('__APP_NAME__ (Preview)');",
    );
    expect(
      fs.readFileSync(path.join(target, '__tests__/app/(tabs)/settings/terms.test.tsx'), 'utf8'),
    ).toContain('/Le damos la bienvenida a/');
    expect(fs.readFileSync(path.join(target, 'docs/architecture.md'), 'utf8')).not.toContain(
      'roadmap.md',
    );
    expect(fs.readFileSync(path.join(target, 'docs/architecture.md'), 'utf8')).toContain(
      'Welcome to {{APP_NAME}} at {{APP_SLUG}}://settings.',
    );
    expect(
      fs.readFileSync(path.join(target, '__tests__/config/tamagui-build.test.ts'), 'utf8'),
    ).toContain('template-metro-test');
    expect(fs.readFileSync(path.join(target, 'docs/app-build-size.md'), 'utf8')).toContain(
      'helps spot size increases as the app grows.',
    );
    expect(fs.existsSync(path.join(target, '.github/workflows/ci.yml'))).toBe(false);
    expect(fs.existsSync(path.join(target, '_github/workflows/ci.yml'))).toBe(true);
    expect(fs.existsSync(path.join(target, '.github/workflows/template-sync.yml'))).toBe(true);
    expect(
      fs.readFileSync(path.join(target, '.github/workflows/ci-quality.yml'), 'utf8'),
    ).toBe('template quality workflow\n');
    expect(fs.existsSync(path.join(target, '_github/workflows/template-sync.yml'))).toBe(false);
    expect(fs.existsSync(path.join(target, '_github/runner/register-runner.sh'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'scripts/old-managed-script.js'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'README.md'))).toBe(true);
    expect(fs.readFileSync(path.join(target, 'README.md'), 'utf8')).toBe('Template README\n');
    expect(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8')).toBe('Template instructions\n');
    expect(fs.readFileSync(path.join(target, 'scripts/postinstall.js'), 'utf8')).toBe(
      'template bootstrap\n',
    );
    expect(
      fs.readFileSync(path.join(target, '__tests__/scripts/sync-template-source.test.js'), 'utf8'),
    ).toBe('template sync test\n');
    expect(fs.existsSync(path.join(target, '.env.local'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'docs/roadmap.md'))).toBe(false);
  });
});
