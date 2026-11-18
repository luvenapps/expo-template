import type { ExpoConfig } from 'expo/config';

import getConfig from '../app.config';

describe('app.config', () => {
  const baseConfig: ExpoConfig = {
    name: '__APP_NAME__',
    slug: '__APP_SLUG__',
  };

  const makeConfig = () => getConfig({ config: baseConfig } as any);

  const originalEnv = process.env.APP_VARIANT;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.APP_VARIANT;
      return;
    }
    process.env.APP_VARIANT = originalEnv;
  });

  it('keeps the configured slug in preview mode', () => {
    process.env.APP_VARIANT = 'preview';
    const config = makeConfig();

    expect(config.slug).toBe('__APP_SLUG__');
    expect(config.name).toBe('__APP_NAME__ (Preview)');
  });

  it('keeps the configured slug in production mode', () => {
    process.env.APP_VARIANT = 'production';
    const config = makeConfig();

    expect(config.slug).toBe('__APP_SLUG__');
    expect(config.name).toBe('__APP_NAME__');
  });

  it('sets the iOS deployment target required by Expo SDK 58', () => {
    const config = makeConfig();

    expect(config.ios?.deploymentTarget).toBe('16.4');
  });

  it('enables Hermes in build properties plugin', () => {
    const config = makeConfig();

    const buildPropertiesPlugin = config.plugins?.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
    ) as
      | [
          string,
          {
            android?: { jsEngine?: string; minSdkVersion?: number; kotlinVersion?: string };
            ios?: { jsEngine?: string; useFrameworks?: 'static' | 'dynamic' };
          },
        ]
      | undefined;

    expect(buildPropertiesPlugin).toBeDefined();
    expect(buildPropertiesPlugin?.[1].android).toMatchObject({
      jsEngine: 'hermes',
      minSdkVersion: 24,
      kotlinVersion: '2.4.0',
    });
    expect(buildPropertiesPlugin?.[1].ios).toMatchObject({
      jsEngine: 'hermes',
      useFrameworks: 'dynamic',
    });
  });

  it('registers the Android Gradle memory plugin', () => {
    const config = makeConfig();

    expect(config.plugins).toContain('./plugins/withAndroidGradleMemory.js');
  });
});
