import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

export type AnalyticsEventPayload = Record<string, unknown>;

export type PerformanceMetric = {
  name: string;
  durationMs?: number;
  metadata?: AnalyticsEventPayload;
};

type AnalyticsContextValue = {
  trackEvent: (event: string, payload?: AnalyticsEventPayload) => void;
  trackError: (error: Error | string, metadata?: AnalyticsEventPayload) => void;
  trackPerformance: (metric: PerformanceMetric) => void;
};

const noop = () => {
  /* no-op */
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  trackEvent: noop,
  trackError: noop,
  trackPerformance: noop,
});

const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function logToConsole(level: 'info' | 'warn' | 'error', message: string, payload?: unknown) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console[level](`[Observability] ${message}`, payload ?? '');
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const value = useMemo<AnalyticsContextValue>(() => {
    const trackEvent = (event: string, payload?: AnalyticsEventPayload) => {
      logToConsole('info', `event:${event}`, {
        ...payload,
        timestamp: new Date().toISOString(),
      });
    };

    const trackError = (error: Error | string, metadata?: AnalyticsEventPayload) => {
      const payload =
        typeof error === 'string'
          ? { message: error, ...metadata }
          : {
              message: error.message,
              stack: error.stack,
              ...metadata,
            };
      logToConsole('error', 'error', payload);
    };

    const trackPerformance = (metric: PerformanceMetric) => {
      logToConsole('info', `perf:${metric.name}`, {
        durationMs: metric.durationMs,
        ...metric.metadata,
      });
    };

    return {
      trackEvent,
      trackError,
      trackPerformance,
    };
  }, []);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
