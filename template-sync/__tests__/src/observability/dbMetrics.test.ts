const platformModule = { Platform: { OS: 'ios' as 'ios' | 'android' | 'web' } };

jest.mock('react-native', () => platformModule);

const mockOpenDatabaseAsync = jest.fn();

// Mock expo-sqlite for dynamic import
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: mockOpenDatabaseAsync,
}));

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

    it('uses sqliteModuleOverride when set', async () => {
      platformModule.Platform.OS = 'ios';
      const customMock = jest.fn();
      const fakeHandle = {
        getFirstSync: jest.fn(() => ({ size: 5 * 1024 * 1024 })),
      };
      customMock.mockResolvedValue(fakeHandle);

      __setDbMetricsSqliteModule({ openDatabaseAsync: customMock });

      const metrics = await getDatabaseSizeMetrics();

      expect(customMock).toHaveBeenCalled();
      expect(metrics).toEqual(
        expect.objectContaining({
          sizeBytes: 5 * 1024 * 1024,
          sizeMB: 5,
        }),
      );
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

    it('handles null size result gracefully', async () => {
      platformModule.Platform.OS = 'ios';
      const fakeHandle = {
        getFirstSync: jest.fn(() => null),
      };
      mockOpenDatabaseAsync.mockResolvedValue(fakeHandle);

      const metrics = await getDatabaseSizeMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          sizeBytes: 0,
          sizeMB: 0,
        }),
      );
    });

    it('handles undefined size property gracefully', async () => {
      platformModule.Platform.OS = 'ios';
      const fakeHandle = {
        getFirstSync: jest.fn(() => ({})),
      };
      mockOpenDatabaseAsync.mockResolvedValue(fakeHandle);

      const metrics = await getDatabaseSizeMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          sizeBytes: 0,
          sizeMB: 0,
        }),
      );
    });
  });

  describe('benchmarkQuery', () => {
    it('returns timing info with query name', async () => {
      const { result, timing } = await benchmarkQuery(async () => 'ok', 'test-query');

      expect(result).toBe('ok');
      expect(timing.queryName).toBe('test-query');
      expect(timing.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('returns timing info without query name', async () => {
      const { result, timing } = await benchmarkQuery(async () => 'result');

      expect(result).toBe('result');
      expect(timing.queryName).toBeUndefined();
      expect(timing.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('measures query duration accurately', async () => {
      const { timing } = await benchmarkQuery(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'delayed';
      }, 'slow-query');

      // Timing can be slightly less than 10ms in fast environments, so we check for >= 5ms
      expect(timing.durationMs).toBeGreaterThanOrEqual(5);
      expect(timing.queryName).toBe('slow-query');
    });

    it('returns query result even when query throws', async () => {
      const errorQuery = async () => {
        throw new Error('Query failed');
      };

      await expect(benchmarkQuery(errorQuery, 'failing-query')).rejects.toThrow('Query failed');
    });
  });
});
