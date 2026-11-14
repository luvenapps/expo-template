/** @jest-environment node */
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { scripts, useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('compute_fingerprint', () => {
  const context = useCiScriptTestContext();
  const script = join(scripts, 'compute_fingerprint.mjs');

  beforeEach(() => {
    context.mockCommand(
      'npx',
      `echo "$*" >> fingerprint-commands.log
if [ "\${FINGERPRINT_FAIL:-}" = true ]; then echo "fingerprint failed" >&2; exit 1; fi
if [ "\${FINGERPRINT_INVALID:-}" = true ]; then echo "not-json"; exit 0; fi
printf '{"hash":"%s"}\\n' "\${MOCK_FINGERPRINT:-native-one}"`,
    );
  });

  test('preserves the previous iOS cache key format', () => {
    const result = context.run([process.execPath, script, 'ios'], {
      GITHUB_REPOSITORY: 'luvenapps/expo-template',
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'false',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('key=ios-luvenapps_expo-template-app-native-one-false-\n');
    expect(result.stderr).toContain('IOS_FINGERPRINT=native-one');
    expect(context.read('fingerprint-commands.log')).toBe(
      '@expo/fingerprint fingerprint:generate --platform ios',
    );
  });

  test('preserves the previous Android cache key format', () => {
    const result = context.run([process.execPath, script, 'android'], {
      GITHUB_REPOSITORY: 'luvenapps/expo-template',
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'false',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toBe('key=android-luvenapps_expo-template-apk-native-one-false-\n');
    expect(context.read('fingerprint-commands.log')).toContain('--platform android');
  });

  test('hashes only the current platform Firebase credential when Firebase is enabled', () => {
    const iosCredentialHash = createHash('sha256').update('ios-config').digest('hex').slice(0, 8);
    const ios = context.run([process.execPath, script, 'ios'], {
      GITHUB_REPOSITORY: 'luvenapps/expo-template',
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'true',
      GOOGLE_SERVICE_INFO_PLIST_B64: 'ios-config',
      GOOGLE_SERVICES_JSON_B64: 'android-config',
    });
    const androidCredentialHash = createHash('sha256')
      .update('android-config')
      .digest('hex')
      .slice(0, 8);
    const android = context.run([process.execPath, script, 'android'], {
      GITHUB_REPOSITORY: 'luvenapps/expo-template',
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'true',
      GOOGLE_SERVICE_INFO_PLIST_B64: 'ios-config',
      GOOGLE_SERVICES_JSON_B64: 'android-config',
    });

    expect(ios.stdout).toBe(
      `key=ios-luvenapps_expo-template-app-native-one-true-${iosCredentialHash}\n`,
    );
    expect(android.stdout).toBe(
      `key=android-luvenapps_expo-template-apk-native-one-true-${androidCredentialHash}\n`,
    );
  });

  test('changes the cache key when the native fingerprint changes', () => {
    const first = context.run([process.execPath, script, 'ios'], {
      GITHUB_REPOSITORY: 'luvenapps/expo-template',
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'false',
      MOCK_FINGERPRINT: 'native-one',
    });
    const second = context.run([process.execPath, script, 'ios'], {
      GITHUB_REPOSITORY: 'luvenapps/expo-template',
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'false',
      MOCK_FINGERPRINT: 'native-two',
    });

    expect(first.status).toBe(0);
    expect(second.status).toBe(0);
    expect(first.stdout).not.toBe(second.stdout);
  });

  test('fails for unsupported platforms, missing enabled credentials, and invalid fingerprints', () => {
    const unsupported = context.run([process.execPath, script, 'web']);
    const missingCredential = context.run([process.execPath, script, 'ios'], {
      EXPO_PUBLIC_TURN_ON_FIREBASE: 'true',
      GOOGLE_SERVICE_INFO_PLIST_B64: '',
    });
    const invalidFingerprint = context.run([process.execPath, script, 'ios'], {
      FINGERPRINT_INVALID: 'true',
    });
    const failedFingerprint = context.run([process.execPath, script, 'ios'], {
      FINGERPRINT_FAIL: 'true',
    });

    expect(unsupported.status).not.toBe(0);
    expect(missingCredential.stderr).toContain('GOOGLE_SERVICE_INFO_PLIST_B64 is required');
    expect(invalidFingerprint.stderr).toContain('did not return valid JSON');
    expect(failedFingerprint.stderr).toContain('fingerprint failed');
  });
});
