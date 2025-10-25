const mockInvoke = jest.fn();
const mockSetCursor = jest.fn();
const mockClearCursor = jest.fn();
let mockRegisterPersistenceTable: jest.Mock;
let mockUpsertRecords: jest.Mock;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('@/auth/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: Parameters<typeof mockInvoke>) => mockInvoke(...args),
    },
  },
}));

const mockSessionState = {
  session: null as null | Record<string, unknown>,
};

jest.mock('@/auth/session', () => ({
  useSessionStore: {
    getState: () => mockSessionState,
  },
}));

const mockCursorState: Record<string, string> = {};

jest.mock('@/sync/cursors', () => ({
  getCursor: jest.fn((key: string) => mockCursorState[key] ?? null),
  setCursor: jest.fn((key: string, value: string) => {
    mockCursorState[key] = value;
    mockSetCursor(key, value);
  }),
  clearCursor: jest.fn((key: string) => {
    delete mockCursorState[key];
    mockClearCursor(key);
  }),
}));

jest.mock('@/sync/localPersistence', () => {
  mockRegisterPersistenceTable = jest.fn();
  mockUpsertRecords = jest.fn();
  return {
    __esModule: true,
    registerPersistenceTable: mockRegisterPersistenceTable,
    upsertRecords: mockUpsertRecords,
  };
});

import { Platform } from 'react-native';
import { pushOutbox, pullUpdates } from '@/sync/driver';
import type { OutboxRecord } from '@/sync/outbox';

describe('sync driver', () => {
  beforeEach(() => {
    mockSessionState.session = { user: { id: 'user-1' } };
    mockInvoke.mockReset();
    mockRegisterPersistenceTable.mockReset();
    mockUpsertRecords.mockReset();
    mockSetCursor.mockReset();
    mockClearCursor.mockReset();
    Object.keys(mockCursorState).forEach((key) => delete mockCursorState[key]);
  });

  describe('pushOutbox', () => {
    it('does nothing when records array is empty', async () => {
      await pushOutbox([]);

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it('throws when user is not authenticated', async () => {
      mockSessionState.session = null;

      await expect(
        pushOutbox([
          {
            id: '1',
            tableName: 'habits',
            rowId: 'habit-1',
            operation: 'insert',
            payload: JSON.stringify({ name: 'Habit' }),
            version: 1,
            attempts: 0,
            createdAt: new Date().toISOString(),
          } as OutboxRecord,
        ]),
      ).rejects.toThrow('Sign in to sync changes across your devices.');
    });

    it('invokes sync-push function with parsed payload', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const record: OutboxRecord = {
        id: '1',
        tableName: 'habits',
        rowId: 'habit-1',
        operation: 'insert',
        payload: JSON.stringify({ name: 'Habit', color: '#fff' }),
        version: 2,
        attempts: 0,
        createdAt: new Date().toISOString(),
      };

      await pushOutbox([record]);

      expect(mockInvoke).toHaveBeenCalledWith('sync-push', {
        body: {
          mutations: [
            {
              id: 'habit-1',
              table: 'habits',
              operation: 'insert',
              version: 2,
              payload: { name: 'Habit', color: '#fff' },
            },
          ],
        },
      });
    });

    it('throws when Supabase function returns error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'failure' },
      });

      await expect(
        pushOutbox([
          {
            id: '1',
            tableName: 'habits',
            rowId: 'habit-1',
            operation: 'insert',
            payload: JSON.stringify({ name: 'Habit' }),
            version: 1,
            attempts: 0,
            createdAt: new Date().toISOString(),
          } as OutboxRecord,
        ]),
      ).rejects.toThrow('failure');
    });

    it('throws when response has success: false', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false },
        error: null,
      });

      await expect(
        pushOutbox([
          {
            id: '1',
            tableName: 'habits',
            rowId: 'habit-1',
            operation: 'insert',
            payload: JSON.stringify({ name: 'Habit' }),
            version: 1,
            attempts: 0,
            createdAt: new Date().toISOString(),
          } as OutboxRecord,
        ]),
      ).rejects.toThrow('Unexpected response from sync push function.');
    });

    it('handles invalid JSON payload gracefully', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const record: OutboxRecord = {
        id: '1',
        tableName: 'habits',
        rowId: 'habit-1',
        operation: 'insert',
        payload: '{invalid json}',
        version: 1,
        attempts: 0,
        createdAt: new Date().toISOString(),
      };

      await pushOutbox([record]);

      expect(mockInvoke).toHaveBeenCalledWith('sync-push', {
        body: {
          mutations: [
            {
              id: 'habit-1',
              table: 'habits',
              operation: 'insert',
              version: 1,
              payload: {},
            },
          ],
        },
      });
    });

    it('rejects on web platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        configurable: true,
      });

      await expect(
        pushOutbox([
          {
            id: '1',
            tableName: 'habits',
            rowId: 'habit-1',
            operation: 'insert',
            payload: JSON.stringify({ name: 'Habit' }),
            version: 1,
            attempts: 0,
            createdAt: new Date().toISOString(),
          } as OutboxRecord,
        ]),
      ).rejects.toThrow(/Sync is only available on iOS and Android/);

      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });
    });
  });

  describe('pullUpdates', () => {
    beforeEach(() => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          cursors: {
            habits: 'cursor-habits',
            habit_entries: 'cursor-entries',
            reminders: null,
            devices: 'cursor-devices',
          },
          records: {
            habits: [
              {
                id: 'habit-1',
                user_id: 'user-1',
                name: 'Habit',
                cadence: 'daily',
                color: '#fff',
                sort_order: 1,
                is_archived: false,
                created_at: '2025-01-01T00:00:00.000Z',
                updated_at: '2025-01-02T00:00:00.000Z',
                version: 3,
                deleted_at: null,
              },
            ],
            habit_entries: [
              {
                id: 'entry-1',
                user_id: 'user-1',
                habit_id: 'habit-1',
                date: '2025-01-01',
                amount: 2,
                source: 'remote',
                created_at: '2025-01-01T00:00:00.000Z',
                updated_at: '2025-01-02T00:00:00.000Z',
                version: 2,
                deleted_at: null,
              },
            ],
            reminders: [],
            devices: [
              {
                id: 'device-1',
                user_id: 'user-1',
                platform: 'ios',
                last_sync_at: '2025-01-02T00:00:00.000Z',
                created_at: '2025-01-01T00:00:00.000Z',
                updated_at: '2025-01-02T00:00:00.000Z',
                version: 1,
                deleted_at: null,
              },
            ],
          },
        },
        error: null,
      });
    });

    it('throws when user is not authenticated', async () => {
      mockSessionState.session = null;

      await expect(pullUpdates()).rejects.toThrow(
        'Sign in to pull updates from your Supabase account.',
      );
    });

    it('applies remote records and updates cursors', async () => {
      await pullUpdates();

      expect(mockUpsertRecords).toHaveBeenCalledWith(
        'habits',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'habit-1',
            userId: 'user-1',
            name: 'Habit',
          }),
        ]),
      );

      expect(mockUpsertRecords).toHaveBeenCalledWith(
        'habit_entries',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'entry-1',
            habitId: 'habit-1',
            amount: 2,
          }),
        ]),
      );

      expect(mockSetCursor).toHaveBeenCalledWith('sync:habits', 'cursor-habits');
      expect(mockSetCursor).toHaveBeenCalledWith('sync:habit_entries', 'cursor-entries');
      expect(mockSetCursor).toHaveBeenCalledWith('sync:devices', 'cursor-devices');
      expect(mockClearCursor).toHaveBeenCalledWith('sync:reminders');
    });

    it('throws when Supabase returns error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'fetch error' },
      });

      await expect(pullUpdates()).rejects.toThrow('fetch error');
    });

    it('throws when response has success: false', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false },
        error: null,
      });

      await expect(pullUpdates()).rejects.toThrow('Unexpected response from sync pull function.');
    });

    it('rejects on web platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        configurable: true,
      });

      await expect(pullUpdates()).rejects.toThrow(/Sync is only available on iOS and Android/);

      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });
    });

    it('filters out invalid reminder records', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          cursors: {},
          records: {
            reminders: [
              // Valid record
              {
                id: 'reminder-1',
                user_id: 'user-1',
                habit_id: 'habit-1',
                time_local: '09:00',
                days_of_week: '1,2,3',
                timezone: 'UTC',
                is_enabled: true,
                created_at: '2025-01-01T00:00:00.000Z',
                updated_at: '2025-01-01T00:00:00.000Z',
                version: 1,
                deleted_at: null,
              },
              // Missing id - should be filtered
              {
                user_id: 'user-1',
                habit_id: 'habit-1',
              },
              // Missing user_id - should be filtered
              {
                id: 'reminder-2',
                habit_id: 'habit-1',
              },
              // Missing habit_id - should be filtered
              {
                id: 'reminder-3',
                user_id: 'user-1',
              },
            ],
          },
        },
        error: null,
      });

      await pullUpdates();

      expect(mockUpsertRecords).toHaveBeenCalledWith(
        'reminders',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'reminder-1',
          }),
        ]),
      );

      // Should only have one valid record
      const remindersCall = (mockUpsertRecords as jest.Mock).mock.calls.find(
        (call) => call[0] === 'reminders',
      );
      expect(remindersCall[1]).toHaveLength(1);
    });

    it('applies default values for missing habit fields', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          cursors: {},
          records: {
            habits: [
              {
                id: 'habit-minimal',
                user_id: 'user-1',
                // All optional fields missing - should use defaults
              },
            ],
          },
        },
        error: null,
      });

      await pullUpdates();

      const habitsCall = (mockUpsertRecords as jest.Mock).mock.calls.find(
        (call) => call[0] === 'habits',
      );
      expect(habitsCall[1][0]).toMatchObject({
        id: 'habit-minimal',
        userId: 'user-1',
        name: '',
        cadence: 'daily',
        color: '#ffffff',
        sortOrder: 0,
        isArchived: false,
        version: 1,
        deletedAt: null,
      });
      expect(habitsCall[1][0].createdAt).toBeDefined();
      expect(habitsCall[1][0].updatedAt).toBeDefined();
    });

    it('applies default values for missing habit entry fields', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          cursors: {},
          records: {
            habit_entries: [
              {
                id: 'entry-minimal',
                user_id: 'user-1',
                habit_id: 'habit-1',
                date: '2025-01-01',
                // All optional fields missing
              },
            ],
          },
        },
        error: null,
      });

      await pullUpdates();

      const entriesCall = (mockUpsertRecords as jest.Mock).mock.calls.find(
        (call) => call[0] === 'habit_entries',
      );
      expect(entriesCall[1][0]).toMatchObject({
        id: 'entry-minimal',
        userId: 'user-1',
        habitId: 'habit-1',
        date: '2025-01-01',
        amount: 0,
        source: 'remote',
        version: 1,
        deletedAt: null,
      });
      expect(entriesCall[1][0].createdAt).toBeDefined();
      expect(entriesCall[1][0].updatedAt).toBeDefined();
    });

    it('applies default values for missing reminder fields', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          cursors: {},
          records: {
            reminders: [
              {
                id: 'reminder-minimal',
                user_id: 'user-1',
                habit_id: 'habit-1',
                // All optional fields missing
              },
            ],
          },
        },
        error: null,
      });

      await pullUpdates();

      const remindersCall = (mockUpsertRecords as jest.Mock).mock.calls.find(
        (call) => call[0] === 'reminders',
      );
      expect(remindersCall[1][0]).toMatchObject({
        id: 'reminder-minimal',
        userId: 'user-1',
        habitId: 'habit-1',
        timeLocal: '09:00',
        daysOfWeek: '',
        timezone: 'UTC',
        isEnabled: true,
        version: 1,
        deletedAt: null,
      });
      expect(remindersCall[1][0].createdAt).toBeDefined();
      expect(remindersCall[1][0].updatedAt).toBeDefined();
    });

    it('applies default values for missing device fields', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          cursors: {},
          records: {
            devices: [
              {
                id: 'device-minimal',
                user_id: 'user-1',
                // All optional fields missing
              },
            ],
          },
        },
        error: null,
      });

      await pullUpdates();

      const devicesCall = (mockUpsertRecords as jest.Mock).mock.calls.find(
        (call) => call[0] === 'devices',
      );
      expect(devicesCall[1][0]).toMatchObject({
        id: 'device-minimal',
        userId: 'user-1',
        platform: 'unknown',
        lastSyncAt: null,
        version: 1,
        deletedAt: null,
      });
      expect(devicesCall[1][0].createdAt).toBeDefined();
      expect(devicesCall[1][0].updatedAt).toBeDefined();
    });

    it('handles response with no records or cursors', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          // No records or cursors provided
        },
        error: null,
      });

      await pullUpdates();

      // Should call upsertRecords with empty arrays
      expect(mockUpsertRecords).toHaveBeenCalledWith('habits', []);
      expect(mockUpsertRecords).toHaveBeenCalledWith('habit_entries', []);
      expect(mockUpsertRecords).toHaveBeenCalledWith('reminders', []);
      expect(mockUpsertRecords).toHaveBeenCalledWith('devices', []);

      // When no cursors provided, clears all cursors
      expect(mockSetCursor).not.toHaveBeenCalled();
      expect(mockClearCursor).toHaveBeenCalledTimes(4);
      expect(mockClearCursor).toHaveBeenCalledWith('sync:habits');
      expect(mockClearCursor).toHaveBeenCalledWith('sync:habit_entries');
      expect(mockClearCursor).toHaveBeenCalledWith('sync:reminders');
      expect(mockClearCursor).toHaveBeenCalledWith('sync:devices');
    });

    it('handles empty records with no changes', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          cursors: {},
          records: {},
        },
        error: null,
      });

      await pullUpdates();

      // Should call upsertRecords with empty arrays for all tables
      expect(mockUpsertRecords).toHaveBeenCalledWith('habits', []);
      expect(mockUpsertRecords).toHaveBeenCalledWith('habit_entries', []);
      expect(mockUpsertRecords).toHaveBeenCalledWith('reminders', []);
      expect(mockUpsertRecords).toHaveBeenCalledWith('devices', []);

      // When empty cursors object provided, clears all cursors
      expect(mockClearCursor).toHaveBeenCalledWith('sync:habits');
      expect(mockClearCursor).toHaveBeenCalledWith('sync:habit_entries');
      expect(mockClearCursor).toHaveBeenCalledWith('sync:reminders');
      expect(mockClearCursor).toHaveBeenCalledWith('sync:devices');
    });
  });
});
