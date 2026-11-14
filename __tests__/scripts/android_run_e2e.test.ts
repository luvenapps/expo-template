/** @jest-environment node */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('android_run_e2e', () => {
  const context = useCiScriptTestContext();

  test('resets Android app data between retries without reinstalling the APK', () => {
    context.mockCommand('adb', 'echo "$*" >> adb-commands.log');
    context.mockCommand('npm', 'if [ ! -f retried ]; then touch retried; exit 1; fi');
    writeFileSync(join(context.root, 'test.apk'), '');
    expect(context.runScript('android_run_e2e.sh', ['test.apk', 'com.example.app']).status).toBe(0);
    const commands = context.read('adb-commands.log').split('\n');
    expect(commands.filter((line) => line === 'install -r test.apk')).toHaveLength(1);
    expect(commands.filter((line) => line === 'shell pm clear com.example.app')).toHaveLength(1);
  });
});
