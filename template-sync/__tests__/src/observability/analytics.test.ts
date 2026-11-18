import { analytics } from '@/observability/analytics';
import * as analyticsCore from '@/observability/analyticsCore';

jest.mock('@/observability/analyticsCore', () => ({
  trackEvent: jest.fn(),
  trackError: jest.fn(),
  trackPerformance: jest.fn(),
  traceAsync: jest.fn(),
}));

describe('analytics helper', () => {
  it('forwards calls to analyticsCore', async () => {
    const traceResult = Promise.resolve('ok');
    (analyticsCore.traceAsync as jest.Mock).mockReturnValue(traceResult);

    analytics.trackEvent('test-event', { source: 'test' });
    analytics.trackError(new Error('boom'), { scope: 'tests' });
    analytics.trackPerformance({ name: 'render', durationMs: 12 });
    const result = await analytics.traceAsync('trace', async () => 'ok');

    expect(analyticsCore.trackEvent).toHaveBeenCalledWith('test-event', { source: 'test' });
    expect(analyticsCore.trackError).toHaveBeenCalledWith(expect.any(Error), { scope: 'tests' });
    expect(analyticsCore.trackPerformance).toHaveBeenCalledWith({ name: 'render', durationMs: 12 });
    expect(analyticsCore.traceAsync).toHaveBeenCalledWith('trace', expect.any(Function));
    expect(result).toBe('ok');
  });
});
