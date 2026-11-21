import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bumpVersion as rawBumpVersion, main as rawMain } from '../../scripts/bump-version.mjs';
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

type BumpVersionOptions = { args?: string[]; cwd?: string };
type BumpVersionResult = {
  currentVersion: string;
  nextVersion: string;
  nextBuildNumber: string;
  nextVersionCode: number;
};
type TestIO = { write: (text: string) => unknown };
type MainOptions = {
  args?: string[];
  cwd?: string;
  stdout?: TestIO;
  stderr?: TestIO;
};

const bumpVersion = rawBumpVersion as (options?: BumpVersionOptions) => BumpVersionResult;
const main = rawMain as (options?: MainOptions) => number;

const validAppConfig = [
  'export default () => {',
  '  return {',
  '    ...config,',
  "    version: '1.2.3',",
  "    ios: { buildNumber: '7' },",
  '    android: { versionCode: 10 },',
  '  };',
  '};',
  '',
].join('\n');

function createIO() {
  return {
    stdout: { write: jest.fn() },
    stderr: { write: jest.fn() },
  };
}

describe('version bump', () => {
  const context = useCiScriptTestContext();

  function writeFixture(appConfig = validAppConfig) {
    writeFileSync(
      join(context.root, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.2.3' }, null, 2) + '\n',
    );
    writeFileSync(join(context.root, 'app.config.ts'), appConfig);
  }

  test('increments the default patch version and both native build numbers', () => {
    writeFixture();

    const result = bumpVersion({ cwd: context.root });

    expect(result).toEqual({
      currentVersion: '1.2.3',
      nextVersion: '1.2.4',
      nextBuildNumber: '8',
      nextVersionCode: 11,
    });
    expect(JSON.parse(readFileSync(join(context.root, 'package.json'), 'utf8')).version).toBe(
      '1.2.4',
    );
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toContain("version: '1.2.4'");
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toContain("buildNumber: '8'");
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toContain('versionCode: 11');
  });

  test('supports a minor release type and an explicit version', () => {
    writeFixture();

    expect(bumpVersion({ cwd: context.root, args: ['--type', 'minor'] }).nextVersion).toBe('1.3.0');
    writeFixture();
    expect(bumpVersion({ cwd: context.root, args: ['--type'] }).nextVersion).toBe('1.2.4');

    writeFixture();
    const output = createIO();
    expect(
      main({
        cwd: context.root,
        args: ['--set', '4.5.6'],
        stdout: output.stdout,
        stderr: output.stderr,
      }),
    ).toBe(0);
    expect(JSON.parse(readFileSync(join(context.root, 'package.json'), 'utf8')).version).toBe(
      '4.5.6',
    );
    expect(output.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('app.config.ts ios.buildNumber -> 8'),
    );
  });

  test('rejects invalid versions without changing either file', () => {
    writeFixture();
    const originalPackage = readFileSync(join(context.root, 'package.json'), 'utf8');
    const originalConfig = readFileSync(join(context.root, 'app.config.ts'), 'utf8');
    const output = createIO();

    expect(
      main({
        cwd: context.root,
        args: ['--set', 'not-a-version'],
        stdout: output.stdout,
        stderr: output.stderr,
      }),
    ).toBe(1);
    expect(output.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Unable to compute next version'),
    );
    expect(readFileSync(join(context.root, 'package.json'), 'utf8')).toBe(originalPackage);
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toBe(originalConfig);
  });

  test.each([
    [
      'a missing config field',
      "export default () => { return { ios: { buildNumber: '7' }, android: { versionCode: 10 } }; };",
    ],
    [
      'an ambiguous config field',
      "export default () => { return { version: '1.2.3', version: '1.2.4', ios: { buildNumber: '7' }, android: { versionCode: 10 } }; };",
    ],
    [
      'a getter instead of a static config field',
      "export default () => { return { get version() { return '1.2.3'; }, ios: { buildNumber: '7' }, android: { versionCode: 10 } }; };",
    ],
    ['invalid TypeScript syntax', "export default () => { return { version: '1.2.3'"],
    [
      'a non-object platform config',
      "export default () => { return { version: '1.2.3', ios: [], android: { versionCode: 10 } }; };",
    ],
    [
      'a non-literal version',
      "export default () => { return { version: process.env.APP_VERSION, ios: { buildNumber: '7' }, android: { versionCode: 10 } }; };",
    ],
    [
      'a non-integer iOS build number',
      "export default () => { return { version: '1.2.3', ios: { buildNumber: '7.5' }, android: { versionCode: 10 } }; };",
    ],
    [
      'a negative iOS build number',
      "export default () => { return { version: '1.2.3', ios: { buildNumber: '-1' }, android: { versionCode: 10 } }; };",
    ],
    [
      'a string Android version code',
      "export default () => { return { version: '1.2.3', ios: { buildNumber: '7' }, android: { versionCode: '10' } }; };",
    ],
  ])('rejects %s without partially updating files', (_description, config) => {
    writeFixture(config);
    const originalPackage = readFileSync(join(context.root, 'package.json'), 'utf8');
    const originalConfig = readFileSync(join(context.root, 'app.config.ts'), 'utf8');

    expect(() => bumpVersion({ cwd: context.root })).toThrow();
    expect(readFileSync(join(context.root, 'package.json'), 'utf8')).toBe(originalPackage);
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toBe(originalConfig);
  });

  test.each([
    ['not a default config function', 'export default {};'],
    [
      'an expression-body config function',
      "export default () => ({ version: '1.2.3', ios: { buildNumber: '7' }, android: { versionCode: 10 } });",
    ],
    ['a function without an object return', 'export default () => { return null; };'],
  ])('rejects %s before writing either file', (_description, config) => {
    writeFixture(config);
    const originalPackage = readFileSync(join(context.root, 'package.json'), 'utf8');
    const originalConfig = readFileSync(join(context.root, 'app.config.ts'), 'utf8');

    expect(() => bumpVersion({ cwd: context.root })).toThrow();
    expect(readFileSync(join(context.root, 'package.json'), 'utf8')).toBe(originalPackage);
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toBe(originalConfig);
  });

  test('fails clearly when app.config.ts is missing without changing package.json', () => {
    writeFixture();
    const originalPackage = readFileSync(join(context.root, 'package.json'), 'utf8');
    unlinkSync(join(context.root, 'app.config.ts'));

    expect(() => bumpVersion({ cwd: context.root })).toThrow('Could not read app.config.ts');
    expect(readFileSync(join(context.root, 'package.json'), 'utf8')).toBe(originalPackage);
  });

  test.each([
    ['malformed package.json', '{'],
    ['a non-string package version', '{"version": 1}'],
  ])('rejects %s without changing the app config', (_description, packageContents) => {
    writeFixture();
    const originalConfig = readFileSync(join(context.root, 'app.config.ts'), 'utf8');
    writeFileSync(join(context.root, 'package.json'), packageContents);

    expect(() => bumpVersion({ cwd: context.root })).toThrow();
    expect(readFileSync(join(context.root, 'package.json'), 'utf8')).toBe(packageContents);
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toBe(originalConfig);
  });

  test('uses default arguments and the current directory when options are omitted', () => {
    writeFixture();
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(context.root);
    try {
      expect(bumpVersion().nextVersion).toBe('1.2.4');
      expect(main()).toBe(0);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  test('runs the command-line entry point with the version:bump flags', () => {
    writeFixture();

    const result = context.runProjectScript('bump-version.mjs', ['--type', 'patch']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('package.json -> 1.2.3 → 1.2.4');
    expect(readFileSync(join(context.root, 'app.config.ts'), 'utf8')).toContain("version: '1.2.4'");
  });
});
