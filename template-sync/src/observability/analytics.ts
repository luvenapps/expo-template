import {
  trackError,
  trackEvent,
  trackPerformance,
  traceAsync,
  type AnalyticsEventPayload,
  type PerformanceMetric,
} from './analyticsCore';

export const analytics = {
  trackEvent,
  trackError,
  trackPerformance,
  traceAsync,
};

export type { AnalyticsEventPayload, PerformanceMetric };
