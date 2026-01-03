/* istanbul ignore file */
export type AppLogEntry = {
  namespace: string;
  eventName: string;
  data?: Record<string, unknown>;
  timestamp: string;
  platform?: string;
  userId?: string;
};

export interface ErrorReporterBackend {
  recordError(error: Error, context?: Record<string, unknown>): void;
  setUserIdentifier(userId: string): void;
  logBreadcrumb(message: string, data?: Record<string, unknown>): void;
}

export interface AnalyticsBackend {
  logEvent(name: string, params?: Record<string, unknown>): void;
  setUserId(userId: string): void;
  setUserProperty(name: string, value: string): void;
}

export interface AppLogsBackend {
  sendLog(log: AppLogEntry): Promise<void>;
  sendBatch(logs: AppLogEntry[]): Promise<void>;
}

export interface PerformanceTrace {
  stop(): void;
  putMetric(name: string, value: number): void;
  putAttribute(name: string, value: string): void;
}

export interface PerformanceBackend {
  startTrace(name: string): PerformanceTrace;
  recordTrace(name: string, durationMs: number, metadata?: Record<string, unknown>): void;
}
