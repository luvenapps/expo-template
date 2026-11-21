const fs = require('node:fs') as typeof import('node:fs');
const os = require('node:os') as typeof import('node:os');
const path = require('node:path') as typeof import('node:path');
import { runWithTimeout as rawBootWithTimeout } from '../../.github/scripts/ios_boot_simulator.mjs';
import { runWithTimeout as rawInstallWithTimeout } from '../../.github/scripts/ios_install_app.mjs';
import { runWithTimeout as rawE2eWithTimeout } from '../../.github/scripts/ios_run_e2e.mjs';

type CommandResult = { status?: number | null; stdout?: string; stderr?: string; error?: Error };
type RunWithTimeout = (
  root: string,
  command: string,
  args: string[],
  seconds: number,
) => CommandResult;

const bootWithTimeout = rawBootWithTimeout as RunWithTimeout;
const installWithTimeout = rawInstallWithTimeout as RunWithTimeout;
const e2eWithTimeout = rawE2eWithTimeout as RunWithTimeout;

describe('iOS command timeout wrappers', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'ios timeout wrappers-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('timeout wrappers preserve command exits and stop a timed out process tree', async () => {
    expect(
      bootWithTimeout(process.cwd(), process.execPath, ['-e', 'process.exit(7)'], 5).status,
    ).toBe(7);
    expect(
      installWithTimeout(process.cwd(), process.execPath, ['-e', 'process.exit(8)'], 5).status,
    ).toBe(8);
    expect(
      e2eWithTimeout(process.cwd(), process.execPath, ['-e', 'setTimeout(() => {}, 5000)'], 0.1)
        .status,
    ).toBe(124);

    const marker = path.join(root, 'surviving-child');
    const childScript = `const fs = require('node:fs'); process.on('SIGTERM', () => {}); setTimeout(() => fs.writeFileSync(${JSON.stringify(marker)}, 'survived'), 1500);`;
    const parentScript = `const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', ${JSON.stringify(childScript)}], { stdio: 'ignore' }); setTimeout(() => {}, 10000);`;
    expect(e2eWithTimeout(process.cwd(), process.execPath, ['-e', parentScript], 0.1).status).toBe(
      124,
    );
    await new Promise((resolve) => setTimeout(resolve, 1700));
    expect(fs.existsSync(marker)).toBe(false);
  });
});
