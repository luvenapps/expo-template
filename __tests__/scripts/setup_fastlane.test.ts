/** @jest-environment node */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

describe('Fastlane setup script', () => {
  let root: string;
  let gemHome: string;
  let bin: string;
  const newline = String.fromCharCode(10);
  const helper = path.resolve(
    process.cwd(),
    '.github/scripts/setup_fastlane.mjs',
  );

  function writeExecutable(file: string, contents: string) {
    fs.writeFileSync(file, contents);
    fs.chmodSync(file, 0o755);
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-fastlane-'));
    gemHome = path.join(root, 'gem-home');
    bin = path.join(root, 'bin');
    fs.mkdirSync(path.join(gemHome, 'bin'), { recursive: true });
    fs.mkdirSync(bin);

    writeExecutable(
      path.join(bin, 'ruby'),
      '#!/bin/sh\nprintf \'%s\\n\' "$FASTLANE_GEM_HOME"\n',
    );
    writeExecutable(
      path.join(bin, 'gem'),
      [
        '#!/bin/sh',
        'if [ "$1" = "install" ]; then',
        '  cat > "$FASTLANE_GEM_HOME/bin/fastlane" <<\'FASTLANE\'',
        '#!/bin/sh',
        "printf '%s\\n' 'RubyGems 4.0.0' 'fastlane 2.228.0'",
        'FASTLANE',
        '  chmod +x "$FASTLANE_GEM_HOME/bin/fastlane"',
        'fi',
        'exit 0',
        '',
      ].join(newline),
    );
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('verifies Fastlane version despite unrelated semantic versions in output', () => {
    const githubPath = path.join(root, 'github-path');
    const result = spawnSync(process.execPath, [helper, '2.228.0'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: bin + path.delimiter + '/usr/bin:/bin',
        FASTLANE_GEM_HOME: gemHome,
        GITHUB_PATH: githubPath,
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Fastlane 2.228.0 successfully installed and verified',
    );
    expect(result.stderr).toBe('');
    expect(fs.readFileSync(githubPath, 'utf8')).toBe(
      path.join(gemHome, 'bin') + newline,
    );
  });

  test('accepts a matching Fastlane already on PATH outside the user gem bin', () => {
    const githubPath = path.join(root, 'github-path');
    writeExecutable(
      path.join(bin, 'fastlane'),
      "#!/bin/sh\nprintf '%s\\n' 'RubyGems 4.0.0' 'fastlane 2.228.0'\n",
    );

    const result = spawnSync(process.execPath, [helper, '2.228.0'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: bin + path.delimiter + '/usr/bin:/bin',
        FASTLANE_GEM_HOME: gemHome,
        GITHUB_PATH: githubPath,
      },
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('fastlane 2.228.0 already installed');
    expect(result.stdout).toContain(
      'Fastlane 2.228.0 successfully installed and verified',
    );
    expect(result.stderr).toBe('');
    expect(fs.existsSync(path.join(gemHome, 'bin', 'fastlane'))).toBe(false);
  });
});
