import type { ExpoConfig } from 'expo/config';

import getConfig from '../app.config';

describe('app.config', () => {
  const baseConfig: ExpoConfig = {
    name: 'betterhabits',
    slug: 'betterhabits',
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

  it('keeps slug as betterhabits in preview mode', () => {
    process.env.APP_VARIANT = 'preview';
    const config = makeConfig();

    expect(config.slug).toBe('betterhabits');
    expect(config.name).toBe('betterhabits (Preview)');
  });

  it('keeps slug as betterhabits in production mode', () => {
    process.env.APP_VARIANT = 'production';
    const config = makeConfig();

    expect(config.slug).toBe('betterhabits');
    expect(config.name).toBe('betterhabits');
  });
});
