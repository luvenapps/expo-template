import { fetchPrimaryEntities } from '@/queries/primaryEntities';
import { fetchEntries } from '@/queries/entries';
import { fetchReminders } from '@/queries/reminders';
import { fetchDevices } from '@/queries/devices';
import { DOMAIN } from '@/config/domain.config';

jest.mock('@/auth/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('@/auth/client') as {
  supabase: { from: jest.Mock };
};

describe('web queries', () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  describe('fetchPrimaryEntities', () => {
    it(`loads ${DOMAIN.entities.primary.plural} and maps them to camelCase`, async () => {
      const rows = [
        {
          id: 'habit-1',
          user_id: 'user-1',
          name: 'Daily Walk',
          cadence: 'daily',
          color: '#ff0000',
          sort_order: 2,
          is_archived: false,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
          version: 3,
          deleted_at: null,
        },
      ];

      const chain = createSingleFilterChain(rows);
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await fetchPrimaryEntities('user-1');

      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true });
      expect(result).toEqual([
        {
          id: 'habit-1',
          userId: 'user-1',
          name: 'Daily Walk',
          cadence: 'daily',
          color: '#ff0000',
          sortOrder: 2,
          isArchived: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          version: 3,
          deletedAt: null,
        },
      ]);
    });

    it('throws when Supabase returns an error', async () => {
      const chain = createSingleFilterChain([], { message: 'network failure' });
      supabase.from.mockReturnValue({ select: chain.select });

      await expect(fetchPrimaryEntities('user-1')).rejects.toThrow('network failure');
    });
  });

  describe('fetchEntries', () => {
    it(`loads ${DOMAIN.entities.entries.plural} for a primary record`, async () => {
      const rows = [
        {
          id: 'entry-1',
          user_id: 'user-1',
          [DOMAIN.entities.entries.row_id]: 'habit-1',
          date: '2025-01-01',
          amount: 2,
          source: 'remote',
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
          version: 1,
          deleted_at: null,
        },
      ];

      const chain = createDoubleFilterChain(rows);
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await fetchEntries('user-1', 'habit-1');

      expect(chain.select).toHaveBeenCalledWith('*');
      expect(chain.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
      expect(chain.eq).toHaveBeenNthCalledWith(2, DOMAIN.entities.entries.row_id, 'habit-1');
      expect(chain.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(result).toEqual([
        {
          id: 'entry-1',
          userId: 'user-1',
          [DOMAIN.entities.entries.foreignKey]: 'habit-1',
          date: '2025-01-01',
          amount: 2,
          source: 'remote',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          version: 1,
          deletedAt: null,
        },
      ]);
    });
  });

  describe('fetchReminders', () => {
    it(`loads ${DOMAIN.entities.reminders.plural}`, async () => {
      const rows = [
        {
          id: 'reminder-1',
          user_id: 'user-1',
          [toSnakeCase(DOMAIN.entities.reminders.foreignKey)]: 'habit-1',
          time_local: '09:00',
          days_of_week: '1,2,3',
          timezone: 'UTC',
          is_enabled: true,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
          version: 1,
          deleted_at: null,
        },
      ];

      const chain = createDoubleFilterChain(rows);
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await fetchReminders('user-1', 'habit-1');

      expect(chain.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1');
      expect(chain.eq).toHaveBeenNthCalledWith(
        2,
        toSnakeCase(DOMAIN.entities.reminders.foreignKey),
        'habit-1',
      );
      expect(result[0]).toMatchObject({
        id: 'reminder-1',
        [DOMAIN.entities.reminders.foreignKey]: 'habit-1',
        timeLocal: '09:00',
      });
    });
  });

  describe('fetchDevices', () => {
    it(`loads ${DOMAIN.entities.devices.plural}`, async () => {
      const rows = [
        {
          id: 'device-1',
          user_id: 'user-1',
          platform: 'web',
          last_sync_at: null,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-02T00:00:00.000Z',
          version: 1,
          deleted_at: null,
        },
      ];

      const chain = createSingleFilterChain(rows);
      supabase.from.mockReturnValue({ select: chain.select });

      const result = await fetchDevices('user-1');

      expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(chain.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(result).toEqual([
        {
          id: 'device-1',
          userId: 'user-1',
          platform: 'web',
          lastSyncAt: null,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-02T00:00:00.000Z',
          version: 1,
          deletedAt: null,
        },
      ]);
    });
  });
});

function createSingleFilterChain(rows: unknown[], error: { message?: string } | null = null) {
  const order = jest.fn().mockResolvedValue({ data: rows, error });
  const eq = jest.fn().mockReturnValue({ order });
  const select = jest.fn().mockReturnValue({ eq, order });
  return { select, eq, order } as const;
}

function createDoubleFilterChain(rows: unknown[], error: { message?: string } | null = null) {
  const order = jest.fn().mockResolvedValue({ data: rows, error });
  const chain: {
    select: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
  } = {
    select: jest.fn(),
    eq: jest.fn(),
    order,
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  return chain;
}

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
