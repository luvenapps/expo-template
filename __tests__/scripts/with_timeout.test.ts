/** @jest-environment node */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { scripts, useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('with_timeout', () => {
  const context = useCiScriptTestContext();

  test('preserves command exit codes', () => {
    const helper = join(scripts, 'with_timeout.sh');
    expect(
      context.run(['bash', '-c', 'source "$1"; run_with_timeout 2 bash -c "exit 7"', '_', helper])
        .status,
    ).toBe(7);
  });

  test('terminates descendants even when they ignore TERM', async () => {
    const helper = join(scripts, 'with_timeout.sh');
    const child = `
      const fs = require('node:fs');
      process.on('SIGTERM', () => {});
      setTimeout(() => fs.writeFileSync('escaped', ''), 1500);
    `;
    const started = Date.now();
    const result = context.run([
      'bash',
      '-c',
      'source "$1"; run_with_timeout 0.2 bash -c \'"$1" -e "$2" & wait\' _ "$2" "$3"',
      '_',
      helper,
      process.execPath,
      child,
    ]);
    expect(result.status).toBe(124);
    expect(Date.now() - started).toBeLessThan(3000);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(existsSync(join(context.root, 'escaped'))).toBe(false);
  });
});
