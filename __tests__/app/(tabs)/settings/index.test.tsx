// Mock expo-router
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const mockReact = jest.requireActual('react');

  const Stack = {
    Screen: ({ options }: any) => {
      return mockReact.createElement('StackScreen', {
        testID: 'stack-screen',
        options,
      });
    },
  };

  return {
    Stack,
    useRouter: () => ({
      push: mockPush,
    }),
  };
});

// Mock setTheme
const mockSetTheme = jest.fn();

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => {
  const { themePalettes } = jest.requireActual('@/ui/theme/palette');
  return {
    useThemeContext: jest.fn(() => ({
      theme: 'system',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
      palette: {
        background: themePalettes.dark.background,
        text: themePalettes.dark.text,
        mutedText: themePalettes.dark.mutedText,
        accent: themePalettes.dark.accent,
        accentMuted: themePalettes.dark.accentMuted,
        surface: themePalettes.dark.surface,
        secondaryBackground: themePalettes.dark.secondaryBackground,
        secondaryText: themePalettes.dark.secondaryText,
      },
    })),
  };
});

// Mock auth session
jest.mock('@/auth/session', () => ({
  useSessionStore: jest.fn(),
}));

jest.mock('@/sync', () => ({
  useSync: jest.fn(),
  pushOutbox: jest.fn(),
  pullUpdates: jest.fn(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
  SafeAreaProvider: ({ children }: any) => children,
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const mockReact = jest.requireActual('react');

  return {
    GestureHandlerRootView: ({ children, style }: any) =>
      mockReact.createElement('GestureHandlerRootView', { style }, children),
  };
});

// Mock Tamagui
jest.mock('tamagui', () => {
  const mockReact = jest.requireActual('react');

  const CardComponent = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);

  CardComponent.Header = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);

  CardComponent.Footer = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);

  const SwitchComponent = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);

  SwitchComponent.Thumb = ({ ...props }: any) => mockReact.createElement('View', props);

  const ProgressComponent = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);

  ProgressComponent.Indicator = ({ ...props }: any) => mockReact.createElement('View', props);

  const SliderComponent = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);

  SliderComponent.Track = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);
  SliderComponent.TrackActive = ({ ...props }: any) => mockReact.createElement('View', props);
  SliderComponent.Thumb = ({ ...props }: any) => mockReact.createElement('View', props);

  return {
    View: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    YStack: ({ children, testID, ...props }: any) =>
      mockReact.createElement('View', { testID, ...props }, children),
    XStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    Card: CardComponent,
    Text: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    Paragraph: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    Button: ({ children, onPress, disabled, ...props }: any) =>
      mockReact.createElement(
        'TouchableOpacity',
        { onPress, disabled, ...props },
        mockReact.createElement('Text', {}, children),
      ),
    H3: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    Switch: SwitchComponent,
    Progress: ProgressComponent,
    Slider: SliderComponent,
  };
});

// Mock Tamagui Lucide Icons
jest.mock('@tamagui/lucide-icons', () => ({
  Monitor: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'monitor-icon', size, color });
  },
  Sun: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'sun-icon', size, color });
  },
  Moon: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'moon-icon', size, color });
  },
  Calendar: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'calendar-icon', size, color });
  },
  RefreshCw: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'refresh-icon', size, color });
  },
  Flame: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'flame-icon', size, color });
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({
      granted: true,
      status: 'granted',
      canAskAgain: true,
    }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({
      granted: true,
      status: 'granted',
    }),
  ),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
  },
}));

const mockTx = { id: 'tx' };
const mockTransaction = jest.fn((cb: (tx: typeof mockTx) => Promise<any>) =>
  Promise.resolve(cb(mockTx)),
);

// Mock data functions
jest.mock('@/data', () => ({
  createPrimaryEntityLocal: jest.fn(),
  createEntryLocal: jest.fn(),
  createReminderLocal: jest.fn(),
  createDeviceLocal: jest.fn(),
}));

// Mock sync outbox
jest.mock('@/sync/outbox', () => ({
  clearAll: jest.fn(),
  getPending: jest.fn(() => Promise.resolve([])),
}));

// Mock SQLite database functions
jest.mock('@/db/sqlite', () => ({
  hasData: jest.fn(() => Promise.resolve(false)),
  clearAllTables: jest.fn(() => Promise.resolve()),
  getDb: jest.fn(() =>
    Promise.resolve({
      transaction: (cb: (tx: typeof mockTx) => Promise<any>) => mockTransaction(cb),
    }),
  ),
}));

jest.mock('@/db/sqlite/retry', () => ({
  withDatabaseRetry: jest.fn((operation: () => Promise<any>) => operation()),
}));

// Mock SQLite events
let mockDatabaseResetListeners: (() => void)[] = [];
jest.mock('@/db/sqlite/events', () => ({
  onDatabaseReset: jest.fn((listener: () => void) => {
    mockDatabaseResetListeners.push(listener);
    return () => {
      mockDatabaseResetListeners = mockDatabaseResetListeners.filter((l) => l !== listener);
    };
  }),
}));

import { useSessionStore } from '@/auth/session';
import {
  createDeviceLocal,
  createEntryLocal,
  createPrimaryEntityLocal,
  createReminderLocal,
} from '@/data';
import { clearAllTables, getDb, hasData } from '@/db/sqlite';
import { withDatabaseRetry } from '@/db/sqlite/retry';
import { useSync } from '@/sync';
import { clearAll as clearOutbox } from '@/sync/outbox';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { themePalettes } from '@/ui/theme/palette';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import SettingsScreen from '../../../../app/(tabs)/settings/index';

const mockedUseSessionStore = useSessionStore as unknown as jest.Mock;
const mockedUseSync = useSync as unknown as jest.Mock;
const mockedUseThemeContext = useThemeContext as unknown as jest.Mock;
const mockedCreatePrimaryEntityLocal = createPrimaryEntityLocal as unknown as jest.Mock;
const mockedCreateEntryLocal = createEntryLocal as unknown as jest.Mock;
const mockedCreateReminderLocal = createReminderLocal as unknown as jest.Mock;
const mockedCreateDeviceLocal = createDeviceLocal as unknown as jest.Mock;
const mockedClearOutbox = clearOutbox as unknown as jest.Mock;
const mockedHasData = hasData as unknown as jest.Mock;
const mockedClearAllTables = clearAllTables as unknown as jest.Mock;
const mockedGetDb = getDb as unknown as jest.Mock;
const mockedWithDatabaseRetry = withDatabaseRetry as unknown as jest.Mock;

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockDatabaseResetListeners = [];
    mockTransaction.mockClear();
    mockTransaction.mockImplementation((cb) => Promise.resolve(cb(mockTx)));
    mockedGetDb.mockResolvedValue({
      transaction: (cb: (tx: typeof mockTx) => Promise<any>) => mockTransaction(cb),
    });
    mockedWithDatabaseRetry.mockImplementation((operation: () => Promise<any>) => operation());
    mockedUseSync.mockImplementation(() => ({
      status: 'idle',
      queueSize: 0,
      lastSyncedAt: null,
      lastError: null,
      triggerSync: jest.fn(),
    }));
  });

  describe('Unauthenticated State', () => {
    beforeEach(() => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'unauthenticated',
          session: null,
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
    });

    it('should render sign in prompt when unauthenticated', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Sign in to sync your data across devices.')).toBeDefined();
    });

    it('should render sign in button when unauthenticated', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Sign In')).toBeDefined();
    });

    it('should navigate to login when sign in button is pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Sign In'));
      expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    });

    it('should show sync disabled message when unauthenticated', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Sign in to enable syncing with your Supabase account.')).toBeDefined();
    });
  });

  describe('Authenticated State', () => {
    const mockSignOut = jest.fn();

    beforeEach(() => {
      mockSignOut.mockClear();
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              email: 'test@example.com',
            },
          },
          signOut: mockSignOut,
          isLoading: false,
        }),
      );
    });

    it('should display user email when authenticated', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Signed in as test@example.com')).toBeDefined();
    });

    it('should render sign out button when authenticated', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Sign Out')).toBeDefined();
    });

    it('should call signOut when button is pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Sign Out'));
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should disable button when loading', () => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'unauthenticated',
          session: null,
          signOut: jest.fn(),
          isLoading: true,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Loading…')).toBeDefined();
    });
  });

  describe('General Rendering', () => {
    beforeEach(() => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'unauthenticated',
          session: null,
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
    });

    it('should render without crashing', () => {
      const { UNSAFE_root } = render(<SettingsScreen />);
      expect(UNSAFE_root).toBeDefined();
    });

    it('should display message about upcoming features', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(
        getByText('Additional settings will arrive alongside theme controls and data export.'),
      ).toBeDefined();
    });

    it('renders sync status section', () => {
      mockedUseSync.mockReturnValue({
        status: 'syncing',
        queueSize: 5,
        lastSyncedAt: '2025-10-10T00:00:00.000Z',
        lastError: 'Network error',
        triggerSync: jest.fn(),
      });

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Sync & Storage')).toBeDefined();
      expect(getByText('Queue size')).toBeDefined();
      expect(getByText(/Last error: Network error/)).toBeDefined();
    });

    it('hides sync status section on web', () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        configurable: true,
      });

      const { queryByText } = render(<SettingsScreen />);
      expect(queryByText('Sync & Storage')).toBeNull();

      Object.defineProperty(Platform, 'OS', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('calls triggerSync when pressing Sync now', () => {
      const triggerSync = jest.fn();
      mockedUseSync.mockReturnValue({
        status: 'idle',
        queueSize: 0,
        lastSyncedAt: null,
        lastError: null,
        triggerSync,
      });
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: { user: { email: 'user@example.com' } },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Sync now'));
      expect(triggerSync).toHaveBeenCalled();
    });
  });

  describe('Theme Selection', () => {
    beforeEach(() => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'unauthenticated',
          session: null,
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
      mockSetTheme.mockClear();
    });

    it('should call setTheme when Follow System button is pressed', () => {
      mockedUseThemeContext.mockReturnValue({
        theme: 'light',
        setTheme: mockSetTheme,
        resolvedTheme: 'light',
        palette: themePalettes.light,
      });

      const { getByLabelText } = render(<SettingsScreen />);

      const systemButton = getByLabelText('Follow System');
      fireEvent.press(systemButton);

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('should call setTheme when Light button is pressed', () => {
      const { getByLabelText } = render(<SettingsScreen />);

      const lightButton = getByLabelText('Light');
      fireEvent.press(lightButton);

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should call setTheme when Dark button is pressed', () => {
      const { getByLabelText } = render(<SettingsScreen />);

      const darkButton = getByLabelText('Dark');
      fireEvent.press(darkButton);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });

  describe('Developer Tools - Seed Sample Data', () => {
    const originalDev = (global as any).__DEV__;

    beforeEach(() => {
      (global as any).__DEV__ = true;
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'unauthenticated',
          session: null,
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
    });

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('should not show developer tools on web platform', () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        configurable: true,
      });

      const { queryByText } = render(<SettingsScreen />);

      expect(queryByText('Seed sample data')).toBeNull();
      expect(queryByText('Clear outbox')).toBeNull();

      Object.defineProperty(Platform, 'OS', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should show error when seeding without authentication', async () => {
      const { getByText } = render(<SettingsScreen />);

      const seedButton = getByText('Seed sample data');
      fireEvent.press(seedButton);

      await waitFor(() => {
        expect(getByText('Sign in on a native build to seed local data.')).toBeDefined();
      });
    });

    it('should seed sample data successfully when authenticated', async () => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const mockPrimaryEntity = {
        id: 'primary-12345678-abcd',
        userId: 'user-123',
        name: 'Sample',
        cadence: 'daily',
        color: undefined,
      };

      mockedCreatePrimaryEntityLocal.mockResolvedValue(mockPrimaryEntity);
      mockedCreateEntryLocal.mockResolvedValue({ id: 'entry-1' });
      mockedCreateReminderLocal.mockResolvedValue({ id: 'reminder-1' });
      mockedCreateDeviceLocal.mockResolvedValue({ id: 'device-1' });

      const { getByText } = render(<SettingsScreen />);

      const seedButton = getByText('Seed sample data');
      fireEvent.press(seedButton);

      await waitFor(() => {
        expect(mockedCreatePrimaryEntityLocal).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-123',
            cadence: 'daily',
          }),
          { database: mockTx },
        );
      });

      expect(mockedCreateEntryLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          amount: 1,
        }),
        { database: mockTx },
      );

      expect(mockedCreateReminderLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          timeLocal: '09:00',
          daysOfWeek: '1,2,3',
          isEnabled: true,
        }),
        { database: mockTx },
      );

      expect(mockedCreateDeviceLocal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          platform: 'ios',
        }),
        { database: mockTx },
      );

      await waitFor(() => {
        const statusText = getByText(/Seeded sample data locally/);
        expect(statusText).toBeDefined();
      });
    });

    it('should handle errors when seeding data fails', async () => {
      // Suppress expected console.error from error handling
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      mockedCreatePrimaryEntityLocal.mockRejectedValue(new Error('Database connection failed'));

      const { getByText } = render(<SettingsScreen />);

      const seedButton = getByText('Seed sample data');
      fireEvent.press(seedButton);

      await waitFor(() => {
        expect(getByText('Error: Database connection failed')).toBeDefined();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Developer Tools - Clear Outbox', () => {
    const originalDev = (global as any).__DEV__;

    beforeEach(() => {
      (global as any).__DEV__ = true;
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'unauthenticated',
          session: null,
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
    });

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('should clear outbox successfully', async () => {
      mockedClearOutbox.mockResolvedValue(undefined);

      const { getByText } = render(<SettingsScreen />);

      const clearButton = getByText('Clear outbox');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(mockedClearOutbox).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(getByText('Outbox cleared.')).toBeDefined();
      });
    });

    it('should handle errors when clearing outbox fails', async () => {
      // Suppress expected console.error from error handling (if any)
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockedClearOutbox.mockRejectedValue(new Error('Failed to clear outbox'));

      const { getByText } = render(<SettingsScreen />);

      const clearButton = getByText('Clear outbox');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(getByText('Failed to clear outbox')).toBeDefined();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Database data check error handling', () => {
    beforeEach(() => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
    });

    it('should handle errors when checking database data fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockedHasData.mockRejectedValueOnce(new Error('Database check failed'));

      render(<SettingsScreen />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[Settings] Error checking database data:',
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle database reset event', async () => {
      mockedHasData.mockResolvedValue(true);

      render(<SettingsScreen />);

      // Simulate database reset by calling the listener
      await waitFor(() => {
        expect(mockDatabaseResetListeners.length).toBeGreaterThan(0);
      });

      // Trigger the database reset event
      mockDatabaseResetListeners.forEach((listener) => listener());

      await waitFor(() => {
        expect(mockedHasData).toHaveBeenCalled();
      });
    });
  });

  describe('Developer Tools - Seed Sample Data Double-Click Prevention', () => {
    const originalDev = (global as any).__DEV__;

    beforeEach(() => {
      (global as any).__DEV__ = true;
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const mockPrimaryEntity = {
        id: 'primary-12345678-abcd',
        userId: 'user-123',
        name: 'Sample',
        cadence: 'daily',
        color: '#60a5fa',
      };

      mockedCreatePrimaryEntityLocal.mockResolvedValue(mockPrimaryEntity);
      mockedCreateEntryLocal.mockResolvedValue({ id: 'entry-1' });
      mockedCreateReminderLocal.mockResolvedValue({ id: 'reminder-1' });
      mockedCreateDeviceLocal.mockResolvedValue({ id: 'device-1' });
    });

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('should prevent double-click on seed operation', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const { getByText } = render(<SettingsScreen />);

      const seedButton = getByText('Seed sample data');

      // Click the button twice rapidly
      fireEvent.press(seedButton);
      fireEvent.press(seedButton);

      // Wait for the first operation to complete
      await waitFor(
        () => {
          expect(getByText(/Seeded sample data locally/)).toBeDefined();
        },
        { timeout: 3000 },
      );

      // Verify createPrimaryEntityLocal was only called once (not twice)
      expect(mockedCreatePrimaryEntityLocal).toHaveBeenCalledTimes(1);

      // Verify the console.log was called for the second click
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Settings] Seed operation already in progress, ignoring click',
      );

      consoleLogSpy.mockRestore();
    });

    it('should run seed operations inside a single transaction', async () => {
      const { getByText } = render(<SettingsScreen />);

      fireEvent.press(getByText('Seed sample data'));

      await waitFor(() => {
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        expect(mockedCreatePrimaryEntityLocal).toHaveBeenCalledWith(
          expect.objectContaining({ userId: 'user-123' }),
          { database: mockTx },
        );
      });

      expect(mockedCreateEntryLocal).toHaveBeenCalledWith(expect.anything(), { database: mockTx });
      expect(mockedCreateReminderLocal).toHaveBeenCalledWith(expect.anything(), {
        database: mockTx,
      });
      expect(mockedCreateDeviceLocal).toHaveBeenCalledWith(
        expect.objectContaining({ platform: Platform.OS }),
        { database: mockTx },
      );
    });
  });

  describe('Developer Tools - Clear Local Database', () => {
    const originalDev = (global as any).__DEV__;

    beforeEach(() => {
      (global as any).__DEV__ = true;
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
      mockedHasData.mockResolvedValue(true);
    });

    afterEach(() => {
      (global as any).__DEV__ = originalDev;
    });

    it('should clear local database successfully', async () => {
      mockedClearAllTables.mockResolvedValue(undefined);

      const { getByText } = render(<SettingsScreen />);

      const clearButton = getByText('Clear local database');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(mockedClearAllTables).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(getByText('Local database cleared successfully.')).toBeDefined();
      });
    });

    it('should handle errors when clearing local database fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockedClearAllTables.mockRejectedValue(new Error('Failed to clear database'));

      const { getByText } = render(<SettingsScreen />);

      const clearButton = getByText('Clear local database');
      fireEvent.press(clearButton);

      await waitFor(() => {
        expect(getByText('Error: Failed to clear database')).toBeDefined();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Settings] Clear local database failed:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should prevent double-click on clear database operation', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      mockedClearAllTables.mockResolvedValue(undefined);

      const { getByText } = render(<SettingsScreen />);

      const clearButton = getByText('Clear local database');

      // Click the button twice rapidly
      fireEvent.press(clearButton);
      fireEvent.press(clearButton);

      // Wait for the operation to complete
      await waitFor(
        () => {
          expect(getByText('Local database cleared successfully.')).toBeDefined();
        },
        { timeout: 3000 },
      );

      // Verify clearAllTables was only called once (not twice)
      expect(mockedClearAllTables).toHaveBeenCalledTimes(1);

      // Verify the console.log was called for the second click
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Settings] Clear operation already in progress, ignoring click',
      );

      consoleLogSpy.mockRestore();
    });
  });
});
