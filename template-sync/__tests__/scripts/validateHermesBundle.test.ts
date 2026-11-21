import { Buffer } from 'node:buffer';
const childProcess = require('node:child_process') as typeof import('node:child_process');
const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const path = require('node:path') as typeof import('node:path');
import {
  loadExpoConfig as rawLoadExpoConfig,
  main as rawMain,
  validateHermesBundle as rawValidateHermesBundle,
} from '../../.github/scripts/validate_hermes_bundle.mjs';

type SpawnResult = { status?: number | null; stdout?: string; stderr?: string; error?: Error };
type SpawnRunner = (
  command: string,
  args: string[],
  options?: { encoding?: string; maxBuffer?: number },
) => SpawnResult;
type Writer = { write: (text: string) => unknown };
type ExpoConfig = Record<string, unknown>;
type BundleResult = {
  platform: string;
  expectedEngine: string;
  bundlePath: string;
  bundleSize: number;
  hasHermesMarker: boolean;
  bundleSource: string;
};
type ValidationOptions = {
  root?: string;
  config?: ExpoConfig;
  loadConfig?: () => ExpoConfig;
  output?: Writer;
  errorOutput?: Writer;
};

const loadExpoConfig = rawLoadExpoConfig as (run?: SpawnRunner) => ExpoConfig;
const main = rawMain as (argv?: string[], options?: ValidationOptions) => number;
const validateHermesBundle = rawValidateHermesBundle as (
  platform: string,
  options?: ValidationOptions,
) => BundleResult;

describe('Hermes bundle validation', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes validation-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  function createDist() {
    const dist = path.join(root, 'dist');
    fs.mkdirSync(dist, { recursive: true });
    return dist;
  }

  function output() {
    return { write: jest.fn() };
  }

  test('loads Expo config through pnpm exec and reports command failures', () => {
    const run = jest.fn(() => ({ status: 0, stdout: '{"jsEngine":"hermes"}', stderr: '' }));
    expect(loadExpoConfig(run)).toEqual({ jsEngine: 'hermes' });
    expect(run).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'expo', 'config', '--json'],
      expect.objectContaining({ encoding: 'utf8' }),
    );
    expect(() => loadExpoConfig(() => ({ status: 1, stderr: 'Expo config failed' }))).toThrow(
      'Expo config failed',
    );
    expect(() => loadExpoConfig(() => ({ status: 1, stderr: '' }))).toThrow(
      'Expo config exited with 1',
    );
    expect(() => loadExpoConfig(() => ({ error: new Error('spawn failed') }))).toThrow(
      'spawn failed',
    );

    const spawn = jest.spyOn(childProcess, 'spawnSync') as jest.SpyInstance;
    spawn.mockReturnValue({
      status: 0,
      stdout: '{"jsEngine":"jsc"}',
      stderr: '',
    });
    expect(loadExpoConfig()).toEqual({ jsEngine: 'jsc' });
    spawn.mockRestore();
  });

  test('rejects invalid platforms, missing dist, and empty dist', () => {
    expect(() => validateHermesBundle('web', { root })).toThrow('Unknown platform: web');
    expect(() => validateHermesBundle('ios', { root, config: {} })).toThrow(
      'dist folder is missing',
    );
    createDist();
    expect(() => validateHermesBundle('ios', { root, config: {} })).toThrow('dist folder is empty');
  });

  test('accepts nested iOS JavaScript and Hermes bytecode bundles', () => {
    const bundle = path.join(createDist(), '_expo', 'static', 'js', 'ios', 'index.hbc');
    fs.mkdirSync(path.dirname(bundle), { recursive: true });
    fs.writeFileSync(bundle, Buffer.from('Hermes bytecode'));
    const log = output();

    expect(validateHermesBundle('ios', { root, config: {}, output: log })).toMatchObject({
      expectedEngine: 'hermes',
      bundlePath: 'dist/_expo/static/js/ios/index.hbc',
      hasHermesMarker: true,
      bundleSource: 'unknown',
    });
    expect(log.write).toHaveBeenCalledWith(expect.stringContaining('bundle file size'));
  });

  test('loads config from an injected provider and validates empty engines', () => {
    const dist = createDist();
    const bundle = path.join(dist, '_expo', 'static', 'js', 'ios', 'index.js');
    fs.mkdirSync(path.dirname(bundle), { recursive: true });
    fs.writeFileSync(bundle, 'plain bundle');
    fs.writeFileSync(path.join(dist, '.bundle-source'), 'expo-export');
    expect(
      validateHermesBundle('ios', {
        root,
        loadConfig: () => ({ ios: { jsEngine: 'jsc' } }),
        output: output(),
      }),
    ).toMatchObject({ expectedEngine: 'jsc', hasHermesMarker: false });
    expect(() =>
      validateHermesBundle('ios', {
        root,
        config: { ios: { jsEngine: '' } },
        output: output(),
      }),
    ).toThrow('Could not determine expected ios JS engine');
  });

  test('accepts the iOS export marker and rejects a missing or empty bundle', () => {
    let dist = createDist();
    fs.writeFileSync(path.join(dist, 'index.html'), 'not a bundle');
    expect(() => validateHermesBundle('ios', { root, config: {} })).toThrow(
      'iOS bundle file not found',
    );

    const bundle = path.join(dist, '_expo', 'static', 'js', 'ios', 'index.js');
    fs.mkdirSync(path.dirname(bundle), { recursive: true });
    fs.writeFileSync(bundle, 'application source');
    expect(() => validateHermesBundle('ios', { root, config: {} })).toThrow('no Hermes marker');
    fs.writeFileSync(path.join(dist, '.bundle-source'), 'expo-export\n');
    expect(validateHermesBundle('ios', { root, config: {} }).bundleSource).toBe('expo-export');

    fs.writeFileSync(bundle, '');
    expect(() => validateHermesBundle('ios', { root, config: {} })).toThrow('Bundle file is empty');
  });

  test('requires Android bundle and asset files before checking engine markers', () => {
    const dist = createDist();
    fs.writeFileSync(path.join(dist, 'index.html'), 'not an Android bundle');
    expect(() => validateHermesBundle('android', { root, config: {} })).toThrow(
      'Bundle file missing: dist/index.android.bundle',
    );
    fs.writeFileSync(path.join(dist, 'index.android.bundle'), 'Hermes bundle');
    expect(() => validateHermesBundle('android', { root, config: {} })).toThrow(
      'Required assets directory missing',
    );
    fs.writeFileSync(path.join(dist, 'assets'), 'not a directory');
    expect(() => validateHermesBundle('android', { root, config: {} })).toThrow(
      'Required assets directory missing',
    );
    fs.rmSync(path.join(dist, 'assets'));
    fs.mkdirSync(path.join(dist, 'assets'));
    expect(validateHermesBundle('android', { root, config: {}, output: output() })).toMatchObject({
      hasHermesMarker: true,
      bundlePath: 'dist/index.android.bundle',
    });
  });

  test('accepts the Android export marker and uses a platform engine override', () => {
    const dist = createDist();
    fs.writeFileSync(path.join(dist, 'index.android.bundle'), 'plain bundle');
    fs.mkdirSync(path.join(dist, 'assets'));
    fs.writeFileSync(path.join(dist, '.bundle-source'), 'export:embed');
    expect(
      validateHermesBundle('android', { root, config: { jsEngine: 'hermes' } }).bundleSource,
    ).toBe('export:embed');

    fs.writeFileSync(path.join(dist, '.bundle-source'), 'other');
    expect(() => validateHermesBundle('android', { root, config: { jsEngine: 'hermes' } })).toThrow(
      'source is not export:embed',
    );
    expect(
      validateHermesBundle('android', {
        root,
        config: { jsEngine: 'hermes', android: { jsEngine: 'jsc' } },
      }),
    ).toMatchObject({ expectedEngine: 'jsc', hasHermesMarker: false, bundleSource: 'other' });
  });

  test('main converts validation success and errors into exit codes', () => {
    const dist = createDist();
    const bundle = path.join(dist, 'index.android.bundle');
    fs.writeFileSync(bundle, 'Hermes');
    fs.mkdirSync(path.join(dist, 'assets'));
    const outputStream = output();
    expect(main(['android'], { root, config: {}, output: outputStream })).toBe(0);
    const errors = output();
    expect(main(['invalid'], { root, errorOutput: errors })).toBe(1);
    expect(errors.write).toHaveBeenCalledWith(expect.stringContaining('Unknown platform'));

    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    try {
      expect(validateHermesBundle('android', { root, config: {} })).toMatchObject({
        bundleSize: 6,
      });
      process.argv = [process.execPath, 'jest', 'android'];
      expect(main(undefined, { root, config: {}, output: output() })).toBe(0);
      process.argv = [
        process.execPath,
        '/repo/.github/scripts/validate_hermes_bundle.mjs',
        'invalid',
      ];
      jest.resetModules();
      require('../../.github/scripts/validate_hermes_bundle.mjs');
      expect(process.exitCode).toBe(1);
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      stdout.mockRestore();
      jest.resetModules();
    }
  });
});
