/** @jest-environment node */
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('ios_boot_simulator', () => {
  const context = useCiScriptTestContext();

  test('records the ready simulator without resetting it', () => {
    context.boot();
    expect(context.read('.simulator_udid')).toBe('test-udid');
    expect(context.read('commands.log')).toContain('simctl bootstatus test-udid -b');
    expect(context.read('commands.log')).toMatch(/-a .*DeviceHub\.app/);
    expect(context.read('commands.log')).not.toMatch(/shutdown|erase/);
  });

  test('falls back to Simulator.app when Device Hub is unavailable', () => {
    rmSync(
      join(context.root, 'DevTools/Xcode.app/Contents/Applications/DeviceHub.app'),
      { recursive: true, force: true },
    );

    context.boot();

    expect(context.read('commands.log')).toMatch(/-a .*Simulator\.app/);
    expect(context.read('commands.log')).not.toMatch(/DeviceHub\.app/);
  });

  test('reports both expected app locations when no simulator UI is available', () => {
    rmSync(
      join(context.root, 'DevTools/Xcode.app/Contents/Applications/DeviceHub.app'),
      { recursive: true, force: true },
    );
    rmSync(
      join(context.root, 'DevTools/Xcode.app/Contents/Developer/Applications/Simulator.app'),
      { recursive: true, force: true },
    );

    const result = context.runScript('ios_boot_simulator.sh');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('No simulator UI found');
    expect(result.stderr).toContain('Expected Device Hub:');
    expect(result.stderr).toContain('Expected Simulator:');
    expect(context.read('commands.log')).not.toContain('bootstatus');
  });

  test('recovers from a failed boot with one reset', () => {
    context.boot({ BOOT_FAIL: 'once' });
    const commands = context.read('commands.log').split('\n');
    expect(commands.filter((line) => line.includes('bootstatus'))).toHaveLength(2);
    expect(commands.filter((line) => line.includes('DeviceHub.app'))).toHaveLength(2);
    expect(commands.filter((line) => line.includes('shutdown'))).toHaveLength(1);
    expect(commands.filter((line) => line.includes('erase'))).toHaveLength(1);
  });

  test('honors the shared retry count', () => {
    const result = context.runScript('ios_boot_simulator.sh', [], {
      BOOT_FAIL: 'always',
      RETRIES: '1',
    });
    expect(result.status).not.toBe(0);
    expect(
      context
        .read('commands.log')
        .split('\n')
        .filter((line) => line.includes('bootstatus')),
    ).toHaveLength(1);
    expect(context.read('commands.log')).not.toContain('erase');
  });

  test('honors the shared retry delay', () => {
    context.mockCommand('sleep', 'echo "sleep $*" >> commands.log');
    context.boot({ BOOT_FAIL: 'once', RETRY_DELAY: '7' });
    expect(context.read('commands.log')).toContain('sleep 7');
  });

  test('removes stale device selection when boot fails', () => {
    writeFileSync(join(context.root, '.simulator_udid'), 'stale');
    expect(context.runScript('ios_boot_simulator.sh', [], { BOOT_FAIL: 'always' }).status).not.toBe(
      0,
    );
    expect(existsSync(join(context.root, '.simulator_udid'))).toBe(false);
  });

  test('fails before boot when the requested device is unavailable', () => {
    expect(
      context.runScript('ios_boot_simulator.sh', [], { IOS_DEVICE: 'missing' }).status,
    ).not.toBe(0);
    expect(context.read('commands.log')).not.toContain('bootstatus');
  });
});
