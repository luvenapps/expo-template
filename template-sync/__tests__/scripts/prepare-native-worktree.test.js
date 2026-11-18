const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const packageJson = require('../../package.json');

const {
  copyFileIfMissing,
  discoverPrimaryCheckout,
  main,
  prepareWorktree,
  readExpoEnvironment,
  requireSupabaseEnvironment,
  runCli,
} = require('../../scripts/prepare-native-worktree');

function createGitWorktrees() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'expo worktree setup-'));
  const primaryCheckout = path.join(temporaryRoot, 'primary checkout');
  const activeWorktree = path.join(temporaryRoot, 'active worktree');

  fs.mkdirSync(primaryCheckout, { recursive: true });
  execFileSync('git', ['init', '-q', primaryCheckout]);
  execFileSync('git', ['-C', primaryCheckout, 'config', 'user.email', 'test@example.com']);
  execFileSync('git', ['-C', primaryCheckout, 'config', 'user.name', 'Test User']);
  fs.writeFileSync(path.join(primaryCheckout, 'README.md'), 'fixture');
  execFileSync('git', ['-C', primaryCheckout, 'add', 'README.md']);
  execFileSync('git', ['-C', primaryCheckout, 'commit', '-qm', 'fixture']);
  execFileSync('git', ['-C', primaryCheckout, 'worktree', 'add', '-q', '--detach', activeWorktree]);

  return {
    temporaryRoot,
    primaryCheckout,
    activeWorktree,
    addWorktree(worktreePath) {
      execFileSync('git', [
        '-C',
        primaryCheckout,
        'worktree',
        'add',
        '-q',
        '--detach',
        worktreePath,
      ]);
    },
  };
}

function validSupabaseEnvironment(overrides = {}) {
  return {
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'dummy-anon-key',
    ...overrides,
  };
}

function parseEnvironment(env = {}) {
  return () => ({ env });
}

describe('native worktree setup', () => {
  let fixture;

  afterEach(() => {
    if (fixture) {
      fs.rmSync(fixture.temporaryRoot, { recursive: true, force: true });
      fixture = undefined;
    }
    jest.restoreAllMocks();
  });

  test('discovers the primary checkout from Git metadata when paths contain spaces', () => {
    fixture = createGitWorktrees();

    expect(fs.realpathSync(discoverPrimaryCheckout(fixture.activeWorktree))).toBe(
      fs.realpathSync(fixture.primaryCheckout),
    );
  });

  test('reports Git worktree command and empty-result failures clearly', () => {
    expect(() =>
      discoverPrimaryCheckout('/repo', () => {
        throw new Error('git failed');
      }),
    ).toThrow('Could not find the primary Git checkout');
    expect(() => discoverPrimaryCheckout('/repo', () => 'branch main\0')).toThrow(
      'Git did not report a primary checkout',
    );
  });

  test('copies the environment and only the requested platform credential', () => {
    fixture = createGitWorktrees();
    fs.writeFileSync(path.join(fixture.primaryCheckout, '.env.local'), 'local settings');
    fs.mkdirSync(path.join(fixture.primaryCheckout, 'credentials'));
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'GoogleService-Info.plist'),
      'ios config',
    );
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'google-services.json'),
      'android config',
    );

    const result = prepareWorktree({
      projectRoot: fixture.activeWorktree,
      platform: 'ios',
      shellEnvironment: validSupabaseEnvironment(),
      parseProjectEnv: parseEnvironment(),
    });

    expect(result).toMatchObject({ copiedEnv: true, copiedCredentials: ['ios'] });
    expect(fs.readFileSync(path.join(fixture.activeWorktree, '.env.local'), 'utf8')).toBe(
      'local settings',
    );
    expect(
      fs.readFileSync(
        path.join(fixture.activeWorktree, 'credentials', 'GoogleService-Info.plist'),
        'utf8',
      ),
    ).toBe('ios config');
    expect(
      fs.existsSync(path.join(fixture.activeWorktree, 'credentials', 'google-services.json')),
    ).toBe(false);
  });

  test('preserves existing worktree environment and platform credentials', () => {
    fixture = createGitWorktrees();
    fs.writeFileSync(path.join(fixture.primaryCheckout, '.env.local'), 'primary settings');
    fs.mkdirSync(path.join(fixture.primaryCheckout, 'credentials'));
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'google-services.json'),
      'primary config',
    );
    fs.writeFileSync(path.join(fixture.activeWorktree, '.env.local'), 'worktree settings');
    fs.mkdirSync(path.join(fixture.activeWorktree, 'credentials'));
    fs.writeFileSync(
      path.join(fixture.activeWorktree, 'credentials', 'google-services.json'),
      'worktree config',
    );

    const result = prepareWorktree({
      projectRoot: fixture.activeWorktree,
      platform: 'android',
      shellEnvironment: validSupabaseEnvironment(),
      parseProjectEnv: parseEnvironment(),
    });

    expect(result).toMatchObject({ copiedEnv: false, copiedCredentials: [] });
    expect(fs.readFileSync(path.join(fixture.activeWorktree, '.env.local'), 'utf8')).toBe(
      'worktree settings',
    );
    expect(
      fs.readFileSync(
        path.join(fixture.activeWorktree, 'credentials', 'google-services.json'),
        'utf8',
      ),
    ).toBe('worktree config');
  });

  test('uses only the primary checkout and accepts Firebase environment fallback', () => {
    fixture = createGitWorktrees();
    const siblingWorktree = path.join(fixture.temporaryRoot, 'sibling worktree');
    fixture.addWorktree(siblingWorktree);
    fs.writeFileSync(path.join(siblingWorktree, '.env.local'), 'sibling settings');
    fs.mkdirSync(path.join(siblingWorktree, 'credentials'));
    fs.writeFileSync(
      path.join(siblingWorktree, 'credentials', 'google-services.json'),
      'sibling config',
    );

    const result = prepareWorktree({
      projectRoot: fixture.activeWorktree,
      platform: 'android',
      shellEnvironment: validSupabaseEnvironment({ GOOGLE_SERVICES_JSON_B64: 'ZmFsbGJhY2s=' }),
      parseProjectEnv: parseEnvironment(),
    });

    expect(result).toMatchObject({ copiedEnv: false, copiedCredentials: [] });
    expect(fs.existsSync(path.join(fixture.activeWorktree, '.env.local'))).toBe(false);
    expect(fs.existsSync(path.join(fixture.activeWorktree, 'credentials'))).toBe(false);
  });

  test('starts with shell configuration and does not require Firebase files', () => {
    fixture = createGitWorktrees();

    expect(
      prepareWorktree({
        projectRoot: fixture.activeWorktree,
        platform: 'start',
        shellEnvironment: validSupabaseEnvironment(),
        parseProjectEnv: parseEnvironment(),
      }),
    ).toMatchObject({ copiedEnv: false, copiedCredentials: [] });
  });

  test('copies both available Firebase credentials when starting', () => {
    fixture = createGitWorktrees();
    fs.mkdirSync(path.join(fixture.primaryCheckout, 'credentials'));
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'GoogleService-Info.plist'),
      'ios config',
    );
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'google-services.json'),
      'android config',
    );

    const result = prepareWorktree({
      projectRoot: fixture.activeWorktree,
      platform: 'start',
      shellEnvironment: validSupabaseEnvironment(),
      parseProjectEnv: parseEnvironment(),
    });

    expect(result.copiedCredentials).toEqual(['ios', 'android']);
    expect(
      fs.readFileSync(
        path.join(fixture.activeWorktree, 'credentials', 'GoogleService-Info.plist'),
        'utf8',
      ),
    ).toBe('ios config');
    expect(
      fs.readFileSync(
        path.join(fixture.activeWorktree, 'credentials', 'google-services.json'),
        'utf8',
      ),
    ).toBe('android config');
  });

  test('reports missing Supabase configuration and platform Firebase credentials', () => {
    fixture = createGitWorktrees();
    fs.writeFileSync(path.join(fixture.primaryCheckout, '.env.local'), '');

    expect(() =>
      prepareWorktree({
        projectRoot: fixture.activeWorktree,
        platform: 'start',
        shellEnvironment: {},
        parseProjectEnv: parseEnvironment(),
      }),
    ).toThrow('EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');

    expect(() =>
      prepareWorktree({
        projectRoot: fixture.activeWorktree,
        platform: 'ios',
        shellEnvironment: validSupabaseEnvironment(),
        parseProjectEnv: parseEnvironment(),
      }),
    ).toThrow('GOOGLE_SERVICE_INFO_PLIST_B64');
  });

  test('reads Expo environment files and lets shell values take precedence', () => {
    fixture = createGitWorktrees();
    fs.writeFileSync(
      path.join(fixture.activeWorktree, '.env.local'),
      'EXPO_PUBLIC_SUPABASE_URL=https://file.supabase.co\nEXPO_PUBLIC_SUPABASE_ANON_KEY=file-key\n',
    );

    const environment = readExpoEnvironment(fixture.activeWorktree, {
      EXPO_PUBLIC_SUPABASE_URL: 'https://shell.supabase.co',
    });

    expect(environment.EXPO_PUBLIC_SUPABASE_URL).toBe('https://shell.supabase.co');
    expect(environment.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBe('file-key');
  });

  test('handles missing source files and exclusive-copy races without overwriting', () => {
    fixture = createGitWorktrees();
    const missingDestination = path.join(fixture.activeWorktree, 'credentials', 'missing.json');
    expect(
      copyFileIfMissing(path.join(fixture.primaryCheckout, 'missing.json'), missingDestination),
    ).toBe(false);

    fs.writeFileSync(path.join(fixture.primaryCheckout, 'config.txt'), 'source');
    const copyFile = jest.spyOn(fs, 'copyFileSync').mockImplementationOnce(() => {
      const error = new Error('created by another process');
      error.code = 'EEXIST';
      throw error;
    });

    expect(
      copyFileIfMissing(
        path.join(fixture.primaryCheckout, 'config.txt'),
        path.join(fixture.activeWorktree, 'config.txt'),
      ),
    ).toBe(false);
    copyFile.mockImplementationOnce(() => {
      throw new Error('disk error');
    });
    expect(() =>
      copyFileIfMissing(
        path.join(fixture.primaryCheckout, 'config.txt'),
        path.join(fixture.activeWorktree, 'config.txt'),
      ),
    ).toThrow('disk error');
  });

  test('rejects unknown commands and exposes concise CLI errors without values', () => {
    fixture = createGitWorktrees();
    expect(() =>
      prepareWorktree({
        projectRoot: fixture.activeWorktree,
        platform: 'web',
      }),
    ).toThrow('supported commands');
    expectSupabaseValidation();

    const logError = jest.fn();
    expect(runCli(['invalid'], { logError })).toBe(1);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('supported commands'));
    expect(() => requireSupabaseEnvironment({ EXPO_PUBLIC_SUPABASE_URL: 'private-url' })).toThrow(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    );
  });

  test('main logs only which setup files were prepared and keeps credential values private', () => {
    fixture = createGitWorktrees();
    fs.writeFileSync(path.join(fixture.primaryCheckout, '.env.local'), 'primary settings');
    fs.mkdirSync(path.join(fixture.primaryCheckout, 'credentials'));
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'google-services.json'),
      'secret config',
    );
    const log = jest.fn();
    const dependencies = {
      projectRoot: fixture.activeWorktree,
      shellEnvironment: validSupabaseEnvironment(),
      parseProjectEnv: parseEnvironment(),
      log,
    };

    expect(main(['android'], dependencies)).toMatchObject({
      copiedEnv: true,
      copiedCredentials: ['android'],
    });
    expect(log.mock.calls.flat().join(' ')).not.toContain('secret config');
    expect(runCli(['start'], { ...dependencies, projectRoot: fixture.primaryCheckout, log })).toBe(
      0,
    );
  });

  test('main reports both platform credentials copied during startup without logging their contents', () => {
    fixture = createGitWorktrees();
    fs.mkdirSync(path.join(fixture.primaryCheckout, 'credentials'));
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'GoogleService-Info.plist'),
      'ios secret config',
    );
    fs.writeFileSync(
      path.join(fixture.primaryCheckout, 'credentials', 'google-services.json'),
      'android secret config',
    );
    const log = jest.fn();

    main(['start'], {
      projectRoot: fixture.activeWorktree,
      shellEnvironment: validSupabaseEnvironment(),
      parseProjectEnv: parseEnvironment(),
      log,
    });

    expect(log).toHaveBeenCalledWith(
      'Prepared Firebase credentials for ios from the primary checkout.',
    );
    expect(log).toHaveBeenCalledWith(
      'Prepared Firebase credentials for android from the primary checkout.',
    );
    expect(log.mock.calls.flat().join(' ')).not.toContain('secret config');
  });

  test('wires preparation into start and native npm lifecycle hooks without replacing troubleshooting', () => {
    expect(packageJson.scripts.prestart).toContain('npm run troubleshoot');
    expect(packageJson.scripts.prestart).toContain('prepare-native-worktree.js start');
    expect(packageJson.scripts.preios).toBe('node scripts/prepare-native-worktree.js ios');
    expect(packageJson.scripts.preandroid).toBe('node scripts/prepare-native-worktree.js android');
    expect(packageJson.scripts.ios).toBe('node scripts/run-native.mjs ios');
    expect(packageJson.scripts.android).toBe('node scripts/run-native.mjs android');
  });
});

function expectSupabaseValidation() {
  expect(() => requireSupabaseEnvironment({})).toThrow('Supabase configuration is missing');
  expect(() =>
    requireSupabaseEnvironment({
      EXPO_PUBLIC_SUPABASE_URL: 'url',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'key',
    }),
  ).not.toThrow();
}
