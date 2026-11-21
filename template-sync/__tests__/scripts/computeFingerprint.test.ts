const childProcess = require('node:child_process') as typeof import('node:child_process');
import { createHash } from 'node:crypto';
import {
  computeFingerprint as rawComputeFingerprint,
  generateFingerprint as rawGenerateFingerprint,
  main as rawMain,
  sanitizeRepositorySlug as rawSanitizeRepositorySlug,
} from '../../.github/scripts/compute_fingerprint.mjs';

type Environment = Record<string, string | undefined>;
type FingerprintOutput = string | { hash?: string };
type FingerprintRunner = (platform: string) => FingerprintOutput;
type SpawnResult = { status?: number | null; stdout?: string; stderr?: string; error?: Error };
type SpawnRunner = (
  command: string,
  args: string[],
  options?: { encoding?: string; maxBuffer?: number },
) => SpawnResult;
type TestIO = {
  stdout: { write: (text: string) => unknown };
  stderr: { write: (text: string) => unknown };
};

const computeFingerprint = rawComputeFingerprint as (
  platform: string,
  environment?: Environment,
  runFingerprint?: FingerprintRunner,
) => {
  key: string;
  fingerprintHash: string;
  repository: string;
  firebaseFlag: string;
  credentialsHash: string;
};
const generateFingerprint = rawGenerateFingerprint as (
  platform: string,
  run?: SpawnRunner,
) => string;
const main = rawMain as (
  argv?: string[],
  environment?: Environment,
  io?: TestIO,
  runFingerprint?: FingerprintRunner,
) => number;
const sanitizeRepositorySlug = rawSanitizeRepositorySlug as (slug: string) => string;

describe('CI build fingerprint', () => {
  test('sanitizes repository names without changing safe characters', () => {
    expect(sanitizeRepositorySlug('luvenapps/betterhabits')).toBe('luvenapps_betterhabits');
    expect(sanitizeRepositorySlug('repo.name-1')).toBe('repo.name-1');
  });

  test('keeps the existing iOS cache key format when Firebase is disabled', () => {
    const runFingerprint = jest.fn(() => ({ hash: 'fingerprint123' }));

    expect(
      computeFingerprint('ios', { GITHUB_REPOSITORY: 'luvenapps/betterhabits' }, runFingerprint),
    ).toEqual({
      key: 'ios-luvenapps_betterhabits-app-fingerprint123-false-',
      fingerprintHash: 'fingerprint123',
      repository: 'luvenapps_betterhabits',
      firebaseFlag: 'false',
      credentialsHash: '',
    });
    expect(runFingerprint).toHaveBeenCalledWith('ios');
  });

  test('uses the Android APK key and hashes only the platform credential when Firebase is enabled', () => {
    const result = computeFingerprint(
      'android',
      {
        EXPO_PUBLIC_TURN_ON_FIREBASE: 'true',
        GOOGLE_SERVICES_JSON_B64: 'android credential',
        GOOGLE_SERVICE_INFO_PLIST_B64: 'ios credential',
      },
      () => '{"hash":"native-hash"}',
    );

    expect(result.key).toBe(
      `android-local-repo-apk-native-hash-true-${createHash('sha256').update('android credential').digest('hex').slice(0, 8)}`,
    );
    expect(result.repository).toBe('local-repo');
  });

  test('hashes the iOS credential and permits an empty credential value', () => {
    const result = computeFingerprint('ios', { EXPO_PUBLIC_TURN_ON_FIREBASE: 'true' }, () => ({
      hash: 'ios-hash',
    }));
    expect(result.key).toContain('ios-local-repo-app-ios-hash-true-');
    expect(result.credentialsHash).toHaveLength(8);
    expect(() => computeFingerprint('ios', {}, () => ({ hash: '' }))).toThrow(
      'did not contain a hash',
    );
  });

  test('rejects missing platforms, unsupported platforms, malformed JSON, and missing hashes', () => {
    expect(() => computeFingerprint('', {}, jest.fn())).toThrow('Platform argument required');
    expect(() => computeFingerprint('web', {}, jest.fn())).toThrow(
      "Platform must be 'ios' or 'android'",
    );
    expect(() => computeFingerprint('ios', {}, () => '{')).toThrow(SyntaxError);
    expect(() => computeFingerprint('ios', {}, () => ({}))).toThrow('did not contain a hash');
  });

  test('runs the Expo fingerprint command and reports process failures', () => {
    const run = jest.fn(() => ({ status: 0, stdout: '{"hash":"ok"}', stderr: '' }));
    expect(generateFingerprint('ios', run)).toBe('{"hash":"ok"}');
    expect(run).toHaveBeenCalledWith(
      'pnpm',
      ['dlx', '@expo/fingerprint', 'fingerprint:generate', '--platform', 'ios'],
      expect.objectContaining({ encoding: 'utf8' }),
    );
    expect(() =>
      generateFingerprint('ios', () => ({ status: 1, stderr: 'fingerprint failed' })),
    ).toThrow('fingerprint failed');
    expect(() => generateFingerprint('ios', () => ({ status: 1, stderr: '' }))).toThrow(
      'Fingerprint command exited with 1',
    );
    expect(() => generateFingerprint('ios', () => ({ error: new Error('spawn failed') }))).toThrow(
      'spawn failed',
    );
  });

  test('writes the key to stdout and diagnostics to stderr', () => {
    const io = { stdout: { write: jest.fn() }, stderr: { write: jest.fn() } };
    const runner = () => ({ hash: 'hash' });

    expect(main(['ios'], { GITHUB_REPOSITORY: 'org/repo' }, io, runner)).toBe(0);
    expect(io.stdout.write).toHaveBeenCalledWith('key=ios-org_repo-app-hash-false-\n');
    expect(io.stderr.write).toHaveBeenCalledWith(expect.stringContaining('IOS_FINGERPRINT=hash'));

    expect(main([], {}, io, runner)).toBe(1);
    expect(io.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Platform argument required'),
    );
  });

  test('uses default process inputs and the default Expo command runner', () => {
    const spawn = jest.spyOn(childProcess, 'spawnSync') as jest.SpyInstance;
    spawn.mockReturnValue({
      status: 0,
      stdout: '{"hash":"default-runner"}',
      stderr: '',
    });
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    try {
      process.argv = [process.execPath, 'jest', 'ios'];
      expect(main(undefined, undefined, undefined)).toBe(0);
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        ['dlx', '@expo/fingerprint', 'fingerprint:generate', '--platform', 'ios'],
        expect.objectContaining({ encoding: 'utf8' }),
      );
      expect(stdout).toHaveBeenCalledWith(expect.stringContaining('default-runner'));
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining('IOS_FINGERPRINT=default-runner'),
      );

      process.argv = [process.execPath, '/repo/.github/scripts/compute_fingerprint.mjs', 'bad'];
      jest.resetModules();
      require('../../.github/scripts/compute_fingerprint.mjs');
      expect(process.exitCode).toBe(1);
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      stdout.mockRestore();
      stderr.mockRestore();
      spawn.mockRestore();
      jest.resetModules();
    }
  });
});
