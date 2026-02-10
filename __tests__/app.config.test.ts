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
});
