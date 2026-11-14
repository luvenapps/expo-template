/** @jest-environment node */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('ios_run_e2e', () => {
  const context = useCiScriptTestContext();

  test('retries Maestro on the same device and preserves attempt logs', () => {
    context.boot();
    expect(context.runScript('ios_run_e2e.sh', [], { TEST_FAIL: 'once' }).status).toBe(0);
    const commands = context.read('maestro-commands.log').split('\n');
    expect(commands).toHaveLength(2);
    expect(commands.every((line) => line.startsWith('--device test-udid test '))).toBe(true);
    expect(existsSync(join(context.root, 'e2e-artifacts/attempt-1/maestro.log'))).toBe(true);
    expect(context.read('e2e-artifacts/EXITCODE')).toBe('0');
  });

  test('reports Maestro failures after exhausting retries', () => {
    context.boot();
    expect(context.runScript('ios_run_e2e.sh', [], { TEST_FAIL: 'always' }).status).not.toBe(0);
    expect(context.read('e2e-artifacts/EXITCODE')).toBe('2');
  });
});
