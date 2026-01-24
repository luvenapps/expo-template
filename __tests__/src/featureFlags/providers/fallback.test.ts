import { createFallbackProvider } from '@/featureFlags/providers/fallback';

describe('featureFlags fallback provider', () => {
  it('returns defaults and allows subscriptions', async () => {
    const provider = createFallbackProvider();
    const unsubscribe = provider.subscribe(jest.fn());

    expect(provider.getStatus()).toBe('ready');
    // Returns fallback when flag doesn't exist in DEFAULT_FLAGS
    expect(provider.getFlag('nonexistent_flag' as never, true)).toBe(true);

    await provider.ready();
    await provider.setContext();
    await provider.refresh();

    unsubscribe();
    provider.destroy();
  });

  it('returns fallback for unknown flags', () => {
    const provider = createFallbackProvider();
    const value = provider.getFlag('unknown_flag' as never, 'fallback');

    expect(value).toBe('fallback');
  });
});
