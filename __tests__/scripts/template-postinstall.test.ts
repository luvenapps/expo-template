import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

const postinstallPath = path.resolve(
  process.cwd(),
  'template-sync/scripts/postinstall.mjs',
);

function writeFile(root: string, relativePath: string, content: string) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

describe('template postinstall', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'template-postinstall-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('materializes the generated app CI mise config', () => {
    const miseCiConfig = '[env]\nCI_TOOL_VERSION = "1.2.3"\n';
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    writeFile(
      root,
      'package.json',
      JSON.stringify({
        name: 'template-starter',
        scripts: {
          postinstall: 'node scripts/postinstall.mjs',
          'db:migrate': 'echo migrated',
        },
      }),
    );
    writeFile(root, '_mise.ci.toml', miseCiConfig);
    writeFile(
      root,
      'scripts/postinstall.mjs',
      fs.readFileSync(postinstallPath, 'utf8'),
    );
    writeFile(root, 'bin/npx', '#!/bin/sh\nexit 0\n');
    writeFile(root, 'bin/npm', '#!/bin/sh\nexit 0\n');
    fs.chmodSync(path.join(bin, 'npx'), 0o755);
    fs.chmodSync(path.join(bin, 'npm'), 0o755);

    const result = spawnSync(
      process.execPath,
      [path.join(root, 'scripts/postinstall.mjs')],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          npm_config_user_agent: 'npm/11.0.0',
        },
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(fs.readFileSync(path.join(root, '.mise.ci.toml'), 'utf8')).toBe(
      miseCiConfig,
    );
    expect(fs.existsSync(path.join(root, '_mise.ci.toml'))).toBe(false);
  });
});
