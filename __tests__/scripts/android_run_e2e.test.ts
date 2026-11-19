/** @jest-environment node */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('android_run_e2e', () => {
  const context = useCiScriptTestContext();

  test.each([
    { manager: 'npm', lockfile: 'package-lock.json', separator: ' --' },
    { manager: 'pnpm', lockfile: 'pnpm-lock.yaml', separator: '' },
  ])(
    'runs E2E with $manager and clears app data between retries without reinstalling',
    ({ manager, lockfile, separator }) => {
      context.mockCommand('adb', 'echo "$*" >> adb-commands.log');
      context.mockCommand(
        manager,
        'echo "$*" >> e2e-commands.log; if [ ! -f retried ]; then touch retried; exit 1; fi',
      );
      writeFileSync(join(context.root, lockfile), '');
      writeFileSync(join(context.root, 'test.apk'), '');
      expect(
        context.runScript('android_run_e2e.mjs', [
          'test.apk',
          'com.example.app',
        ]).status,
      ).toBe(0);
      expect(context.read('e2e-commands.log').split('\n')).toEqual([
        `run e2e:android${separator} --test-output-dir e2e-artifacts/attempt-1`,
        `run e2e:android${separator} --test-output-dir e2e-artifacts/attempt-2`,
      ]);
      const commands = context.read('adb-commands.log').split('\n');
      expect(
        commands.filter((line) => line === 'install -r test.apk'),
      ).toHaveLength(1);
      expect(
        commands.filter((line) => line === 'shell pm clear com.example.app'),
      ).toHaveLength(1);
    },
  );

  test.each([
    { args: [], error: 'apk path required' },
    { args: ['test.apk'], error: 'package name required' },
    { args: ['missing.apk', 'com.example.app'], error: 'APK not found' },
  ])('rejects invalid APK inputs with $error', ({ args, error }) => {
    const result = context.runScript('android_run_e2e.mjs', args);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(error);
  });

  test.each([
    { env: { RETRIES: '0' }, error: 'RETRIES must be a positive integer' },
    {
      env: { RETRY_DELAY: '-1' },
      error: 'RETRY_DELAY must be a non-negative integer',
    },
    {
      env: {},
      error: 'Generated app must contain exactly one supported lockfile',
    },
  ])('reports setup errors before touching the device', ({ env, error }) => {
    writeFileSync(join(context.root, 'test.apk'), '');
    const result = context.runScript(
      'android_run_e2e.mjs',
      ['test.apk', 'com.example.app'],
      env,
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(error);
  });

  test('retries failed APK installs and stops after the last attempt', () => {
    writeFileSync(join(context.root, 'test.apk'), '');
    writeFileSync(join(context.root, 'package-lock.json'), '{}');
    context.mockCommand('adb', 'if [ "$1" = install ]; then exit 1; fi');
    const result = context.runScript(
      'android_run_e2e.mjs',
      ['test.apk', 'com.example.app'],
      {
        RETRIES: '',
        RETRY_DELAY: '1',
      },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Install failed after 2 attempts');
  });

  test('reports E2E failure when the selected package manager is missing', () => {
    writeFileSync(join(context.root, 'test.apk'), '');
    writeFileSync(join(context.root, 'pnpm-lock.yaml'), '');
    context.mockCommand(
      'adb',
      'if [ "$*" = "shell pm clear com.example.app" ]; then exit 1; fi',
    );
    const result = context.runScript(
      'android_run_e2e.mjs',
      ['test.apk', 'com.example.app'],
      {
        PATH: join(context.root, 'bin'),
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('spawnSync pnpm ENOENT');
    expect(result.stdout).toContain('E2E failed after 2 attempts');
    expect(context.read('e2e-artifacts/EXITCODE')).toBe('2');
  });
});
