import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import {
  trackError,
  trackEvent,
  trackPerformance,
  type AnalyticsEventPayload,
  type PerformanceMetric,
} from './analyticsCore';

export type AnalyticsContextValue = {
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

export { __resetAnalyticsStateForTests } from './analyticsCore';

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const value = useMemo<AnalyticsContextValue>(() => {
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
