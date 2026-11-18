import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import DeveloperUtilities from '../../../../app/(tabs)/settings/developer-utilities';

const mockSyncData: any = {
  status: 'idle',
  queueSize: 1,
  lastSyncedAt: null,
  lastError: null,
  triggerSync: () => mockSync(),
};
const mockFlags: any = { value: false, source: 'default' };
const mockNotification: any = {
  permissionStatus: 'granted',
  notificationStatus: 'enabled',
  softLastDeclinedAt: 0,
};
let mockResetCallback: () => void;
const mockState: any = { status: 'authenticated', session: { user: { id: 'user-1' } } };
const mockToast = { show: jest.fn() };
const mockSync = jest.fn().mockResolvedValue(undefined);
const mockClearOutbox = jest.fn().mockResolvedValue(undefined);
const mockClearTables = jest.fn().mockResolvedValue(undefined);
const mockOptimize = jest.fn().mockResolvedValue(undefined);
const mockArchive = jest.fn().mockResolvedValue(1);
const mockPush = jest.fn();
const mockNotify = jest.fn().mockResolvedValue({ status: 'triggered' });
const mockSeries = jest.fn().mockResolvedValue(['one', 'two']);
const mockSchedule = jest.fn().mockResolvedValue('one');
const mockCancel = jest.fn().mockResolvedValue(undefined);
const mockClearSeries = jest.fn().mockResolvedValue(undefined);
const mockCreatePrimary = jest.fn().mockResolvedValue({ id: 'habit-12345678' });
const mockCreateReminder = jest.fn().mockResolvedValue({ id: 'reminder-1' });
const mockUpdateReminder = jest.fn().mockResolvedValue(undefined);
const mockDeleteReminder = jest.fn().mockResolvedValue(undefined);
const mockQueue = jest.fn();
const mockHasData = jest.fn().mockResolvedValue(true);
const mockStoreKeys = jest.fn(() => ['answer']);
const mockStoreValue = jest.fn(() => '{\"answer\":42}');
const mockPushStatus = jest
  .fn()
  .mockResolvedValue({ isRegistered: true, apnsToken: 'apns', fcmToken: 'fcm' });
const mockFriendly: jest.Mock = jest.fn(() => ({ friendly: { description: 'Friendly error' } }));

jest.mock('@/auth/session', () => ({ useSessionStore: (selector: any) => selector(mockState) }));
jest.mock('@/data', () => ({
  createPrimaryEntityLocal: (...args: any[]) => mockCreatePrimary(...args),
  createEntryLocal: jest.fn(),
  createDeviceLocal: jest.fn(),
  createReminderLocal: (...args: any[]) => mockCreateReminder(...args),
  updateReminderLocal: (...args: any[]) => mockUpdateReminder(...args),
  deleteReminderLocal: (...args: any[]) => mockDeleteReminder(...args),
}));
jest.mock('@/db/sqlite', () => ({
  hasData: () => mockHasData(),
  clearAllTables: () => mockClearTables(),
  getDb: async () => ({ transaction: (fn: any) => fn({}) }),
}));
jest.mock('@/db/sqlite/archive', () => ({ archiveOldEntries: () => mockArchive() }));
jest.mock('@/db/sqlite/events', () => ({
  onDatabaseReset: (callback: () => void) => {
    mockResetCallback = callback;
    return () => {};
  },
}));
jest.mock('@/db/sqlite/maintenance', () => ({ optimizeDatabase: () => mockOptimize() }));
jest.mock('@/db/sqlite/retry', () => ({ withDatabaseRetry: (fn: any) => fn() }));
jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: () => mockFriendly,
}));
jest.mock('@/featureFlags', () => ({ DEFAULT_FLAGS: { test_feature_flag: false } }));
jest.mock('@/featureFlags/useFeatureFlag', () => ({ useFeatureFlag: () => mockFlags }));
jest.mock('@/notifications/notifications', () => ({
  cancelAllScheduledNotifications: () => mockCancel(),
}));
jest.mock('@/notifications/pushRegistrationStatus', () => ({
  getPushRegistrationStatus: () => mockPushStatus(),
}));
jest.mock('@/notifications/scheduler', () => ({
  clearReminderSeriesConfigs: () => mockClearSeries(),
  scheduleReminder: () => mockSchedule(),
  scheduleReminderSeries: () => mockSeries(),
}));
jest.mock('@/notifications/useNotificationSettings', () => ({
  useNotificationSettings: () => ({ tryPromptForPush: mockNotify, ...mockNotification }),
}));
jest.mock('@/observability/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn() }),
}));
jest.mock('@/state', () => ({ useSyncStore: { getState: () => ({ setQueueSize: mockQueue }) } }));
jest.mock('@/sync', () => ({
  pullUpdates: jest.fn(),
  pushOutbox: jest.fn(),
  useSync: () => mockSyncData,
}));
jest.mock('@/sync/cursors', () => ({ resetCursors: jest.fn() }));
jest.mock('@/sync/outbox', () => ({
  clearAll: () => mockClearOutbox(),
  getPending: async () => [],
}));
jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: () => ({ palette: { accent: '#123456' } }),
}));
jest.mock('@react-native-firebase/messaging', () => ({}));
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getAllKeys: mockStoreKeys,
    getString: mockStoreValue,
    getNumber: () => undefined,
    getBoolean: () => undefined,
  }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ status: 'granted', canAskAgain: true }),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/ui/icons', () => {
  const React = require('react');
  return {
    Calendar: () => React.createElement('View'),
    Flame: () => React.createElement('View'),
    RefreshCw: () => React.createElement('View'),
  };
});
jest.mock('@/ui', () => {
  const React = require('react');
  const Box = ({ children, testID }: any) => React.createElement('View', { testID }, children);
  const Button = ({ children, onPress, testID, disabled }: any) =>
    React.createElement('Text', { testID, onPress, disabled }, children);
  const Chart = ({ formatDayLabel, formatPercentLabel }: any) =>
    React.createElement(
      'Text',
      null,
      formatDayLabel(1),
      formatDayLabel(2),
      formatPercentLabel(0.5),
    );
  const Section = ({ children, title, footer, testID, footerTestID }: any) =>
    React.createElement(
      'View',
      { testID },
      React.createElement('Text', null, title),
      children,
      footer && React.createElement('Text', { testID: footerTestID }, footer),
    );
  return {
    ScreenContainer: Box,
    PrimaryButton: Button,
    SecondaryButton: Button,
    SettingsSection: Section,
    CalendarHeatmap: Box,
    StreakChart: Chart,
    StatCard: Box,
    ToastContainer: Box,
    useToast: () => mockToast,
  };
});
jest.mock('tamagui', () => {
  const React = require('react');
  const Box = ({ children, ...props }: any) => React.createElement('View', props, children);
  const Text = ({ children, ...props }: any) => React.createElement('Text', props, children);
  const Switch: any = ({ children, onCheckedChange, testID }: any) =>
    React.createElement('View', { testID, onValueChange: onCheckedChange }, children);
  Switch.Thumb = Box;
  const RadioGroup: any = ({ children, onValueChange, ...props }: any) =>
    React.createElement('View', { ...props, onValueChange }, children);
  RadioGroup.Item = Box;
  RadioGroup.Indicator = Box;
  const Progress: any = Box;
  Progress.Indicator = Box;
  return {
    Label: Text,
    Paragraph: Text,
    Text,
    Progress,
    RadioGroup,
    Separator: Box,
    Switch,
    XStack: Box,
    YStack: Box,
  };
});

const platform = (value: string) =>
  Object.defineProperty(Platform, 'OS', { configurable: true, value });
const press = async (id: string) => {
  await fireEvent.press(screen.getByTestId(id));
};

describe('developer utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    platform('ios');
    mockSyncData.status = 'idle';
    mockSyncData.queueSize = 1;
    mockSyncData.lastSyncedAt = null;
    mockSyncData.lastError = null;
    mockFlags.value = false;
    mockNotification.softLastDeclinedAt = 0;
    mockState.status = 'authenticated';
    mockState.session = { user: { id: 'user-1' } };
  });
  afterAll(() => platform('ios'));

  it('runs local maintenance and refreshes the sync queue', async () => {
    await render(<DeveloperUtilities />);
    await press('settings-sync-now');
    await waitFor(() => expect(mockSync).toHaveBeenCalled());
    await press('dev-seed-button');
    await waitFor(() => expect(mockCreatePrimary).toHaveBeenCalled());
    await press('dev-clear-outbox-button');
    await waitFor(() => expect(mockClearOutbox).toHaveBeenCalled());
    await press('dev-clear-db-button');
    await waitFor(() => expect(mockClearTables).toHaveBeenCalled());
    await press('dev-optimize-db-button');
    await waitFor(() => expect(mockOptimize).toHaveBeenCalled());
    expect(mockQueue).toHaveBeenCalled();
  });

  it('schedules and resets reminders and registers push', async () => {
    await render(<DeveloperUtilities />);
    await press('dev-register-push-button');
    await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    await press('dev-schedule-reminder-once-button');
    await waitFor(() => expect(mockSchedule).toHaveBeenCalled());
    await press('dev-schedule-reminder-button');
    await waitFor(() => expect(mockSeries).toHaveBeenCalled());
    await press('dev-reset-reminders-button');
    await waitFor(() => expect(mockCancel).toHaveBeenCalled());
    expect(mockClearSeries).toHaveBeenCalled();
    await press('dev-run-reminder-action-button');
    await waitFor(() => expect(mockCreateReminder).toHaveBeenCalled());
  });

  it('archives data, inspects storage, and opens the database viewer', async () => {
    await render(<DeveloperUtilities />);
    await fireEvent(screen.getByTestId('dev-archive-toggle'), 'valueChange', true);
    await fireEvent.press(screen.getByText('Archive'));
    await waitFor(() => expect(mockArchive).toHaveBeenCalled());
    await press('dev-log-notification-store-button');
    await press('dev-log-mmkv-stores-button');
    expect(mockStoreKeys).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('View local database'));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/database');
    await press('dev-log-push-status-button');
    await waitFor(() => expect(mockFriendly).toHaveBeenCalled());
    await press('dev-crashlytics-crash-button');
    expect(screen.getByText('Enable Firebase to test Crashlytics.')).toBeTruthy();
  });

  it('supports reminder changes and daily scheduling', async () => {
    await render(<DeveloperUtilities />);
    await press('dev-run-reminder-action-button');
    await waitFor(() => expect(mockCreateReminder).toHaveBeenCalled());
    await fireEvent(screen.getByLabelText('Reminder action'), 'valueChange', 'update');
    await press('dev-run-reminder-action-button');
    await waitFor(() =>
      expect(mockUpdateReminder).toHaveBeenCalledWith(
        expect.objectContaining({ timeLocal: '10:30' }),
      ),
    );
    await fireEvent(screen.getByLabelText('Reminder action'), 'valueChange', 'disable');
    await press('dev-run-reminder-action-button');
    await waitFor(() =>
      expect(mockUpdateReminder).toHaveBeenCalledWith(
        expect.objectContaining({ isEnabled: false }),
      ),
    );
    await fireEvent(screen.getByLabelText('Reminder action'), 'valueChange', 'delete');
    await press('dev-run-reminder-action-button');
    await waitFor(() => expect(mockDeleteReminder).toHaveBeenCalled());
    await fireEvent(screen.getByLabelText('Test reminder cadence'), 'valueChange', 'daily');
    await press('dev-schedule-reminder-button');
    await waitFor(() => expect(screen.getByText(/Scheduled 2 daily reminders/)).toBeTruthy());
  });

  it('surfaces maintenance and reminder failures', async () => {
    mockSync.mockRejectedValueOnce(new Error('sync'));
    mockClearOutbox.mockRejectedValueOnce(new Error('outbox'));
    mockClearTables.mockRejectedValueOnce(new Error('database'));
    mockOptimize.mockRejectedValueOnce(new Error('optimize'));
    mockArchive.mockRejectedValueOnce(new Error('archive'));
    mockSchedule.mockRejectedValueOnce(new Error('schedule'));
    mockSeries.mockRejectedValueOnce(new Error('series'));
    mockCancel.mockRejectedValueOnce(new Error('cancel'));
    await render(<DeveloperUtilities />);
    for (const id of [
      'settings-sync-now',
      'dev-clear-outbox-button',
      'dev-clear-db-button',
      'dev-optimize-db-button',
      'dev-schedule-reminder-once-button',
      'dev-schedule-reminder-button',
      'dev-reset-reminders-button',
    ]) {
      await press(id);
      await waitFor(() => expect(mockFriendly).toHaveBeenCalled());
    }
    await fireEvent.press(screen.getByText('Archive'));
    await waitFor(() => expect(mockArchive).toHaveBeenCalled());
    expect(mockFriendly.mock.calls.length).toBeGreaterThanOrEqual(7);
  });

  it('shows authenticated, syncing and signed-out states', async () => {
    mockSyncData.status = 'syncing';
    mockSyncData.queueSize = 12;
    mockSyncData.lastSyncedAt = '2025-01-01T00:00:00Z';
    mockSyncData.lastError = 'sync failure';
    mockFlags.value = true;
    mockNotification.softLastDeclinedAt = Date.now();
    const result = await render(<DeveloperUtilities />);
    expect(screen.getByText('Syncing…')).toBeTruthy();
    expect(screen.getByText(/This text will show/)).toBeTruthy();
    mockResetCallback();
    mockState.status = 'unauthenticated';
    mockState.session = null;
    mockSyncData.status = 'idle';
    mockSyncData.queueSize = 0;
    await result.rerender(<DeveloperUtilities />);
    expect(screen.getByTestId('settings-sync-disabled')).toBeTruthy();
  });

  it.each(['denied', 'unavailable', 'already-enabled'])(
    'reports push registration %s',
    async (status) => {
      mockNotify.mockResolvedValueOnce({ status });
      await render(<DeveloperUtilities />);
      await press('dev-register-push-button');
      await waitFor(() => expect(mockNotify).toHaveBeenCalled());
    },
  );

  it('handles empty and multiple archive and reminder results', async () => {
    mockArchive.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    mockSeries.mockResolvedValueOnce([]);
    mockSchedule.mockResolvedValueOnce(null);
    await render(<DeveloperUtilities />);
    await fireEvent.press(screen.getByText('Archive'));
    await screen.findByText('Archive complete. No qualifying entries found.');
    await fireEvent.press(screen.getByText('Archive'));
    await screen.findByText('Archived 2 entries for manual validation.');
    await press('dev-schedule-reminder-once-button');
    await screen.findByText('Reminder not scheduled (permissions may be missing).');
    await press('dev-schedule-reminder-button');
    await screen.findByText('Reminders not scheduled (permissions may be missing).');
  });

  it('reports when a reminder action has no record', async () => {
    await render(<DeveloperUtilities />);
    await fireEvent(screen.getByLabelText('Reminder action'), 'valueChange', 'update');
    await press('dev-run-reminder-action-button');
    await screen.findByText('Create a reminder first.');
  });

  it('handles empty and invalid local storage values', async () => {
    mockStoreKeys.mockReturnValueOnce([]).mockReturnValue(['key']);
    mockStoreValue.mockReturnValue('not json');
    await render(<DeveloperUtilities />);
    await press('dev-log-notification-store-button');
    expect(screen.getByText('Notification store is empty (MMKV).')).toBeTruthy();
    await press('dev-log-mmkv-stores-button');
    expect(screen.getByText('MMKV stores logged to console.')).toBeTruthy();
  });

  it.each([
    { descriptionKey: 'error.description' },
    { originalMessage: 'Original failure' },
    { titleKey: 'error.title' },
    {},
  ])('uses available friendly error details', async (friendly) => {
    mockFriendly.mockReturnValue({ friendly });
    const cases = [
      ['settings-sync-now', mockSync],
      ['dev-seed-button', mockCreatePrimary],
      ['dev-clear-outbox-button', mockClearOutbox],
      ['dev-clear-db-button', mockClearTables],
      ['dev-optimize-db-button', mockOptimize],
      ['dev-schedule-reminder-once-button', mockSchedule],
      ['dev-schedule-reminder-button', mockSeries],
      ['dev-reset-reminders-button', mockCancel],
    ] as const;
    await render(<DeveloperUtilities />);
    for (const [id, action] of cases) {
      const previousCalls = mockFriendly.mock.calls.length;
      action.mockRejectedValueOnce(new Error('test error'));
      await press(id);
      await waitFor(() => expect(mockFriendly.mock.calls.length).toBeGreaterThan(previousCalls));
    }
    mockArchive.mockRejectedValueOnce(new Error('archive'));
    await fireEvent.press(screen.getByText('Archive'));
    await waitFor(() => expect(mockArchive).toHaveBeenCalled());
    mockFriendly.mockReturnValue({ friendly: { description: 'Friendly error' } });
  });

  it('handles database and storage read failures', async () => {
    mockHasData.mockRejectedValueOnce(new Error('read failed'));
    mockStoreKeys.mockImplementationOnce(() => {
      throw new Error('store failed');
    });
    await render(<DeveloperUtilities />);
    await press('dev-log-notification-store-button');
    expect(screen.getByText('Failed to read notification store (see console).')).toBeTruthy();
    mockStoreKeys.mockImplementationOnce(() => {
      throw new Error('store failed');
    });
    await press('dev-log-mmkv-stores-button');
    expect(screen.getByText('Failed to read MMKV stores (see console).')).toBeTruthy();
    mockStoreKeys.mockReturnValue([]);
    await press('dev-log-mmkv-stores-button');
    expect(screen.getByText('All MMKV stores are empty.')).toBeTruthy();
  });

  it('guards local actions when signed out and hides developer tools when disabled', async () => {
    mockState.status = 'unauthenticated';
    mockState.session = null;
    const result = await render(<DeveloperUtilities />);
    await press('settings-sync-now');
    await press('dev-seed-button');
    expect(screen.getByText('Sign in on a native build to seed local data.')).toBeTruthy();
    await press('dev-run-reminder-action-button');
    expect(screen.getByText('Sign in to create reminders.')).toBeTruthy();
    const previous = (globalThis as any).__DEV__;
    (globalThis as any).__DEV__ = false;
    await result.rerender(<DeveloperUtilities />);
    expect(screen.queryByTestId('dev-seed-button')).toBeNull();
    (globalThis as any).__DEV__ = previous;
  });

  it('shows the web push control without native utilities', async () => {
    platform('web');
    await render(<DeveloperUtilities />);
    expect(screen.queryByTestId('dev-seed-button')).toBeNull();
    await press('dev-register-push-button');
    expect(mockNotify).toHaveBeenCalled();
  });
});
