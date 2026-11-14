/** @jest-environment node */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scripts, useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('validate_hermes_bundle', () => {
  const context = useCiScriptTestContext();
  const script = join(scripts, 'validate_hermes_bundle.mjs');

  beforeEach(() => {
    context.mockCommand('npx', `printf '{"jsEngine":"hermes"}\\n'`);
  });

  test('accepts the exported iOS Hermes bundle', () => {
    const bundleDirectory = join(context.root, 'dist/_expo/static/js/ios');
    mkdirSync(bundleDirectory, { recursive: true });
    writeFileSync(join(bundleDirectory, 'index.hbc'), 'Hermes bytecode');

    const result = context.run([process.execPath, script, 'ios']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('platform: ios');
    expect(result.stdout).toContain('Hermes marker present: yes');
  });

  test('accepts the exported Android bundle and assets', () => {
    mkdirSync(join(context.root, 'dist/assets'), { recursive: true });
    writeFileSync(join(context.root, 'dist/index.android.bundle'), 'Hermes bytecode');
    writeFileSync(join(context.root, 'dist/.bundle-source'), 'export:embed');

    const result = context.run([process.execPath, script, 'android']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('platform: android');
    expect(result.stdout).toContain('bundle source: export:embed');
  });

  test('rejects missing Android assets and unsupported platforms', () => {
    mkdirSync(join(context.root, 'dist'), { recursive: true });
    writeFileSync(join(context.root, 'dist/index.android.bundle'), 'Hermes bytecode');

    const missingAssets = context.run([process.execPath, script, 'android']);
    const unsupported = context.run([process.execPath, script, 'web']);

    expect(missingAssets.status).not.toBe(0);
    expect(missingAssets.stderr).toContain('Required Android assets directory is missing');
    expect(unsupported.status).not.toBe(0);
  });
});
