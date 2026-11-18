const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Buffer } = require('node:buffer');

const firebaseCredentials = require('../../plugins/withFirebaseCredentials');

const originalArgv = [...process.argv];
const originalEnvironment = {};
const environmentKeys = [
  'EXPO_TOKEN',
  'EAS_BUILD_PLATFORM',
  'GOOGLE_SERVICE_INFO_PLIST_B64',
  'GOOGLE_SERVICES_JSON_B64',
];

function encoded(value) {
  return Buffer.from(value).toString('base64');
}

describe('withFirebaseCredentials', () => {
  let temporaryRoot;

  beforeEach(() => {
    process.argv = ['node', 'expo'];
    environmentKeys.forEach((key) => {
      originalEnvironment[key] = process.env[key];
      delete process.env[key];
    });
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'expo firebase credentials-'));
  });

  afterEach(() => {
    process.argv = originalArgv;
    environmentKeys.forEach((key) => {
      if (originalEnvironment[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnvironment[key];
      }
    });
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  test('recognizes native run commands, explicit prebuild platforms, and EAS platforms', () => {
    expect(firebaseCredentials.detectPlatform(['expo', 'run:ios'], {})).toBe('ios');
    expect(firebaseCredentials.detectPlatform(['expo', 'run:android'], {})).toBe('android');
    expect(firebaseCredentials.detectPlatform(['expo', 'prebuild', '--platform', 'IOS'], {})).toBe(
      'ios',
    );
    expect(firebaseCredentials.detectPlatform(['expo'], { EAS_BUILD_PLATFORM: 'ANDROID' })).toBe(
      'android',
    );
    expect(firebaseCredentials.detectPlatform(['expo', '--platform', 'web'], {})).toBe('web');
    expect(firebaseCredentials.detectPlatform(['expo', 'config'], {})).toBeNull();
  });

  test('recognizes only actual build contexts', () => {
    expect(firebaseCredentials.isActualBuild(['expo', 'start'], {})).toBe(false);
    expect(firebaseCredentials.isActualBuild(['expo', 'run:ios'], {})).toBe(true);
    expect(firebaseCredentials.isActualBuild(['expo', 'prebuild'], {})).toBe(true);
    expect(firebaseCredentials.isActualBuild(['expo'], { EXPO_TOKEN: 'token' })).toBe(false);
    expect(
      firebaseCredentials.isActualBuild(['eas', 'build', '--platform', 'ios'], {
        EXPO_TOKEN: 'token',
      }),
    ).toBe(true);
    expect(firebaseCredentials.isActualBuild(['expo'], { EAS_BUILD_PLATFORM: 'ios' })).toBe(true);
  });

  test('keeps token-only web render workers from requiring native credentials', () => {
    process.argv = ['node', 'expo-router/node/render.js'];
    process.env.EXPO_TOKEN = 'token';
    const config = { name: 'app' };

    expect(firebaseCredentials(config)).toBe(config);
    expect(fs.existsSync(path.join(temporaryRoot, 'credentials'))).toBe(false);
  });

  test('uses the iOS command to generate only the iOS file from the existing base64 fallback', () => {
    const value = '<plist>dummy-ios</plist>';
    process.env.GOOGLE_SERVICE_INFO_PLIST_B64 = encoded(value);

    firebaseCredentials.generateCredentials(temporaryRoot, 'ios');

    expect(
      fs.readFileSync(path.join(temporaryRoot, 'credentials', 'GoogleService-Info.plist'), 'utf8'),
    ).toBe(value);
    expect(fs.existsSync(path.join(temporaryRoot, 'credentials', 'google-services.json'))).toBe(
      false,
    );
  });

  test('uses the Android command to generate the Android file', () => {
    const value = '{"dummy":true}';
    process.env.GOOGLE_SERVICES_JSON_B64 = encoded(value);

    firebaseCredentials.generateCredentials(temporaryRoot, 'android');

    expect(
      fs.readFileSync(path.join(temporaryRoot, 'credentials', 'google-services.json'), 'utf8'),
    ).toBe(value);
    expect(fs.existsSync(path.join(temporaryRoot, 'credentials', 'GoogleService-Info.plist'))).toBe(
      false,
    );
  });

  test('requires both files for an unscoped prebuild and preserves existing files on repeat calls', () => {
    const iosPath = path.join(temporaryRoot, 'credentials', 'GoogleService-Info.plist');
    fs.mkdirSync(path.dirname(iosPath), { recursive: true });
    fs.writeFileSync(iosPath, 'existing config');
    process.env.GOOGLE_SERVICES_JSON_B64 = encoded('android config');
    firebaseCredentials.generateCredentials(temporaryRoot, null);

    process.env.GOOGLE_SERVICE_INFO_PLIST_B64 = encoded('replacement config');
    firebaseCredentials.generateCredentials(temporaryRoot, null);
    firebaseCredentials.generateCredentials(temporaryRoot, null);

    expect(fs.readFileSync(iosPath, 'utf8')).toBe('existing config');
    expect(
      fs.readFileSync(path.join(temporaryRoot, 'credentials', 'google-services.json'), 'utf8'),
    ).toBe('android config');
  });

  test('fails with platform-specific recovery instructions when the fallback is absent', () => {
    expect(() => firebaseCredentials.generateCredentials(temporaryRoot, 'ios')).toThrow(
      'Add credentials/GoogleService-Info.plist to the primary checkout or configure GOOGLE_SERVICE_INFO_PLIST_B64',
    );
  });

  test('does not replace an existing credential and handles an exclusive-write race', () => {
    const credentialPath = path.join(temporaryRoot, 'GoogleService-Info.plist');
    fs.writeFileSync(credentialPath, 'existing');
    expect(firebaseCredentials.writeCredentialIfMissing(credentialPath, encoded('new'))).toBe(
      false,
    );
    expect(fs.readFileSync(credentialPath, 'utf8')).toBe('existing');

    const fileSystem = {
      writeFileSync() {
        const error = new Error('another process created the file');
        error.code = 'EEXIST';
        throw error;
      },
    };
    expect(
      firebaseCredentials.writeCredentialIfMissing(credentialPath, encoded('new'), fileSystem),
    ).toBe(false);

    expect(() =>
      firebaseCredentials.writeCredentialIfMissing(credentialPath, encoded('new'), {
        writeFileSync() {
          throw new Error('disk failure');
        },
      }),
    ).toThrow('disk failure');
  });

  test('keeps config evaluation inert outside builds and safely repeats native evaluation', () => {
    const config = { name: 'app' };
    expect(firebaseCredentials(config)).toBe(config);

    process.argv = ['node', 'expo', 'run:ios'];
    process.env.GOOGLE_SERVICE_INFO_PLIST_B64 = encoded('fresh ios config');
    const cwd = jest.spyOn(process, 'cwd').mockReturnValue(temporaryRoot);
    expect(firebaseCredentials(config)).toBe(config);
    expect(firebaseCredentials(config)).toBe(config);
    expect(
      fs.readFileSync(path.join(temporaryRoot, 'credentials', 'GoogleService-Info.plist'), 'utf8'),
    ).toBe('fresh ios config');
    cwd.mockRestore();
  });

  test('keeps web config evaluation credential-free and rejects unknown platforms', () => {
    expect(() => firebaseCredentials.generateCredentials(temporaryRoot, 'web')).not.toThrow();
    expect(() => firebaseCredentials.generateCredentials(temporaryRoot, 'macos')).toThrow(
      'Unsupported Firebase credential platform: macos',
    );
  });
});
