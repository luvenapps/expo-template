/** @jest-environment node */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { scripts, useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('with_timeout', () => {
  const context = useCiScriptTestContext();

  test('preserves command exit codes', () => {
    const helper = join(scripts, 'with_timeout.mjs');
    expect(context.run([process.execPath, helper, '2', process.execPath, '-e', 'process.exit(7)']).status).toBe(7);
  });

  test('terminates descendants even when they ignore TERM', async () => {
    const helper = join(scripts, 'with_timeout.mjs');
    const child = "const fs = require('node:fs'); process.on('SIGTERM', () => {}); setTimeout(() => fs.writeFileSync('escaped', ''), 1500);";
    const parent = `const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', ${JSON.stringify(child)}], { stdio: 'ignore' }); setTimeout(() => {}, 10000);`;
    const started = Date.now();
    const result = context.run([
      process.execPath,
      helper,
      '0.2',
      process.execPath,
      '-e',
      parent,
    ]);
    expect(result.status).toBe(124);
    expect(Date.now() - started).toBeLessThan(3000);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(existsSync(join(context.root, 'escaped'))).toBe(false);
  });
});
