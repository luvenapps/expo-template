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

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: jest.fn(() => ({
    theme: 'dark',
    setTheme: jest.fn(),
    resolvedTheme: 'dark',
    palette: {
      background: '#1a1a1a',
      text: '#FFFFFF',
      mutedText: '#E2E8F0',
    },
  })),
}));

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
  return {
    YStack: ({ children, testID, ...props }: any) =>
      mockReact.createElement('View', { testID, ...props }, children),
    XStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    Paragraph: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    Button: ({ children, onPress, disabled, ...props }: any) =>
      mockReact.createElement(
        'TouchableOpacity',
        { onPress, disabled, ...props },
        mockReact.createElement('Text', {}, children),
      ),
    H3: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
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
}));

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';
import { useSessionStore } from '@/auth/session';
import { useSync } from '@/sync';
import SettingsScreen from '../../../../app/(tabs)/settings/index';

const mockedUseSessionStore = useSessionStore as unknown as jest.Mock;
const mockedUseSync = useSync as unknown as jest.Mock;

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
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
      expect(getByText('Sign in to sync your data across devices')).toBeDefined();
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
      expect(getByText(/Sync Status:/)).toBeDefined();
      expect(getByText(/Queue size: 5/)).toBeDefined();
      expect(getByText(/Last error: Network error/)).toBeDefined();
    });

    it('hides sync status section on web', () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        configurable: true,
      });

      const { queryByText } = render(<SettingsScreen />);
      expect(queryByText(/Sync Status:/)).toBeNull();

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
});
