import { render, waitFor } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { AnalyticsProvider, useAnalytics } from '@/observability/AnalyticsProvider';

describe('AnalyticsProvider', () => {
  const originalEndpoint = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT;
  const originalKey = process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT = 'https://app.posthog.com/capture/';
    process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY = 'test-key';
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
      } as Response),
    );
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT = originalEndpoint;
    process.env.EXPO_PUBLIC_ANALYTICS_WRITE_KEY = originalKey;
    global.fetch = originalFetch;
    jest.clearAllMocks();
    (console.info as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
    (console.warn as jest.Mock).mockRestore();
  });

  const FireEvents = () => {
    const analytics = useAnalytics();

    useEffect(() => {
      analytics.trackEvent('test', { foo: 'bar' });
      analytics.trackError(new Error('boom'), { section: 'test' });
      analytics.trackPerformance({ name: 'render', durationMs: 5 });
    }, [analytics]);

    return null;
  };

  it('posts analytics payloads when env vars are provided', async () => {
    render(
      <AnalyticsProvider>
        <FireEvents />
      </AnalyticsProvider>,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    const [firstCall] = (global.fetch as jest.Mock).mock.calls;
    expect(firstCall[0]).toBe('https://app.posthog.com/capture/');
    const requestInit = firstCall[1] as RequestInit;
    expect(requestInit?.method).toBe('POST');
    const body = JSON.parse((requestInit?.body as string) ?? '{}');
    expect(body.api_key).toBe('test-key');
    expect(body.event).toBe('test');
    expect(body.properties.foo).toBe('bar');
    expect(typeof body.distinct_id).toBe('string');
  });
});
