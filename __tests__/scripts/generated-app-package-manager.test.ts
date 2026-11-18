/** @jest-environment node */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

describe('generated app package manager', () => {
  let root: string;
  let template: string;
  let app: string;
  let bin: string;
  let env: NodeJS.ProcessEnv;
  const newline = String.fromCharCode(10);
  const helper = path.resolve(
    process.cwd(),
    '.github/scripts/generated-app-package-manager.mjs',
  );

  function writeFile(directory: string, relativePath: string, content: string) {
    const file = path.join(directory, relativePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }

  function run(args: string[], cwd = root, overrides: NodeJS.ProcessEnv = {}) {
    return spawnSync(process.execPath, [helper, ...args], {
      cwd,
      env: { ...env, ...overrides },
      encoding: 'utf8',
    });
  }

  function mockManager(name: string) {
    const log = path.join(root, name + '.log');
    const script = [
      '#!/bin/sh',
      'printf "%s\\n" "$*" >> "' + log + '"',
      '',
    ].join(newline);
    writeFile(bin, name, script);
    fs.chmodSync(path.join(bin, name), 0o755);
  }

  beforeEach(() => {
    root = fs.mkdtempSync(
      path.join(os.tmpdir(), 'generated-app-package-manager-'),
    );
    template = path.join(root, 'template-sync');
    app = path.join(root, 'generated-app');
    bin = path.join(root, 'bin');
    fs.mkdirSync(template);
    fs.mkdirSync(app);
    fs.mkdirSync(bin);
    env = {
      ...process.env,
      PATH: bin + path.delimiter + process.env.PATH,
    };
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('selects the generated app lockfile and ignores the repository root lockfile', () => {
    writeFile(root, 'package-lock.json', '{}');
    writeFile(app, 'pnpm-lock.yaml', 'lockfileVersion: 9.0');

    const result = run(['detect', app]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('pnpm' + newline);
  });

  test('rejects missing and conflicting app lockfiles', () => {
    const missing = run(['detect', app]);
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain('found none');

    writeFile(app, 'package-lock.json', '{}');
    writeFile(app, 'pnpm-lock.yaml', 'lockfileVersion: 9.0');

    const conflicting = run(['detect', app]);
    expect(conflicting.status).not.toBe(0);
    expect(conflicting.stderr).toContain(
      'found package-lock.json, pnpm-lock.yaml',
    );
  });

  test('stages the template lockfile when Create Expo App omits it', () => {
    writeFile(template, 'pnpm-lock.yaml', 'lockfileVersion: 9.0');

    const result = run(['stage', app, template]);

    expect(result.status).toBe(0);
    expect(fs.readFileSync(path.join(app, 'pnpm-lock.yaml'), 'utf8')).toBe(
      'lockfileVersion: 9.0',
    );
  });

  test('rejects a generated lockfile that differs from the template lockfile', () => {
    writeFile(template, 'package-lock.json', '{}');
    writeFile(app, 'pnpm-lock.yaml', 'lockfileVersion: 9.0');

    const result = run(['stage', app, template]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('does not match template-sync');
  });

  test('emits package-manager outputs for workflow setup steps', () => {
    writeFile(template, 'package-lock.json', '{}');
    const output = path.join(root, 'github-output');
    const envFile = path.join(root, 'github-env');

    const result = run(['stage', app, template], root, {
      GITHUB_OUTPUT: output,
      GITHUB_ENV: envFile,
    });

    expect(result.status).toBe(0);
    expect(fs.readFileSync(output, 'utf8')).toBe('manager=npm' + newline);
    expect(fs.readFileSync(envFile, 'utf8')).toBe(
      'APP_PACKAGE_MANAGER=npm' + newline,
    );
  });

  test('uses the selected package manager for installs, scripts and binaries', () => {
    mockManager('npm');
    mockManager('pnpm');
    writeFile(app, 'package-lock.json', '{}');

    const install = run(['install'], app);
    const script = run(['run', 'test', '--', '--coverage'], app);
    expect(install.status).toBe(0);
    expect(script.status).toBe(0);
    expect(fs.readFileSync(path.join(root, 'npm.log'), 'utf8')).toBe(
      [
        'ci --prefer-offline --no-audit --no-fund',
        'run test -- --coverage',
        '',
      ].join(newline),
    );

    fs.unlinkSync(path.join(app, 'package-lock.json'));
    writeFile(app, 'pnpm-lock.yaml', 'lockfileVersion: 9.0');
    const pnpmInstall = run(['install'], app);
    const pnpmScript = run(['run', 'test', '--', '--coverage'], app);
    const exec = run(['exec', 'expo', 'install', '--check'], app);
    const dlx = run(['dlx', '@expo/repack-app', '--platform', 'ios'], app);
    expect(pnpmInstall.status).toBe(0);
    expect(pnpmScript.status).toBe(0);
    expect(exec.status).toBe(0);
    expect(dlx.status).toBe(0);
    expect(fs.readFileSync(path.join(root, 'pnpm.log'), 'utf8')).toBe(
      [
        'install --frozen-lockfile --prefer-offline --reporter=append-only',
        'run test --coverage',
        'exec expo install --check',
        'dlx @expo/repack-app --platform ios',
        '',
      ].join(newline),
    );
  });
});
