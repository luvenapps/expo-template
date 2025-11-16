const platformModule = { Platform: { OS: 'ios' as 'ios' | 'android' | 'web' } };

jest.mock('react-native', () => platformModule);

const mockOpenDatabaseAsync = jest.fn();

const dbMetrics =
  require('@/observability/dbMetrics') as typeof import('@/observability/dbMetrics');
const { getDatabaseSizeMetrics, benchmarkQuery, __setDbMetricsSqliteModule } = dbMetrics;

describe('dbMetrics', () => {
  beforeEach(() => {
    mockOpenDatabaseAsync.mockReset();
    platformModule.Platform.OS = 'ios';
    __setDbMetricsSqliteModule({ openDatabaseAsync: mockOpenDatabaseAsync });
  });

  describe('getDatabaseSizeMetrics', () => {
    it('returns null on web', async () => {
      platformModule.Platform.OS = 'web';
      __setDbMetricsSqliteModule(undefined);
      const metrics = await getDatabaseSizeMetrics();
      expect(metrics).toBeNull();
    });

    it('reports size metrics from pragma query', async () => {
      platformModule.Platform.OS = 'ios';
      const fakeHandle = {
        getFirstSync: jest.fn(() => ({ size: 10 * 1024 * 1024 })),
      };
      mockOpenDatabaseAsync.mockResolvedValue(fakeHandle);

      const metrics = await getDatabaseSizeMetrics();

      expect(mockOpenDatabaseAsync).toHaveBeenCalled();
      expect(metrics).toEqual(
        expect.objectContaining({
          sizeBytes: 10 * 1024 * 1024,
          sizeMB: 10,
        }),
      );
    });
  });

  describe('benchmarkQuery', () => {
    it('returns timing info', async () => {
      const { result, timing } = await benchmarkQuery(async () => 'ok', 'test-query');

      expect(result).toBe('ok');
      expect(timing.queryName).toBe('test-query');
      expect(timing.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
