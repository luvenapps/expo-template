import type { ExpoConfig } from 'expo/config';

import getConfig from '../app.config';

describe('app.config', () => {
  const baseConfig: ExpoConfig = {
    name: 'appname',
    slug: 'appname',
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

  it('keeps slug as appname in preview mode', () => {
    process.env.APP_VARIANT = 'preview';
    const config = makeConfig();

    expect(config.slug).toBe('appname');
    expect(config.name).toBe('appname (Preview)');
  });

  it('keeps slug as appname in production mode', () => {
    process.env.APP_VARIANT = 'production';
    const config = makeConfig();

    expect(config.slug).toBe('appname');
    expect(config.name).toBe('appname');
  });

  it('enables Hermes globally and in build properties plugin', () => {
    const config = makeConfig();

    expect(config.jsEngine).toBe('hermes');

    const buildPropertiesPlugin = config.plugins?.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
    ) as [string, { android?: { jsEngine?: string }; ios?: { jsEngine?: string } }] | undefined;

    expect(buildPropertiesPlugin).toBeDefined();
    expect(buildPropertiesPlugin?.[1].android?.jsEngine).toBe('hermes');
    expect(buildPropertiesPlugin?.[1].ios?.jsEngine).toBe('hermes');
  });
});
