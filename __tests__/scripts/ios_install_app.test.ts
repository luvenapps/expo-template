/** @jest-environment node */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('ios_install_app', () => {
  const context = useCiScriptTestContext();

  test('installs on the recorded device without launching the app', () => {
    context.boot();
    mkdirSync(join(context.root, 'Test.app'));
    expect(context.runScript('ios_install_app.sh', ['Test.app']).status).toBe(0);
    expect(context.read('commands.log')).toContain('simctl install test-udid Test.app');
    expect(context.read('commands.log')).not.toContain('launch');
  });

  test('fails after exhausting install attempts', () => {
    context.boot();
    mkdirSync(join(context.root, 'Test.app'));
    expect(
      context.runScript('ios_install_app.sh', ['Test.app'], { INSTALL_FAIL: 'always' }).status,
    ).not.toBe(0);
    expect(
      context
        .read('commands.log')
        .split('\n')
        .filter((line) => line.includes('simctl install')),
    ).toHaveLength(2);
  });
});
