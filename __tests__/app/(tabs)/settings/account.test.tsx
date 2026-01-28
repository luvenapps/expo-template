import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignOut = jest.fn();
const mockSetQueueSize = jest.fn();
const mockHasData = jest.fn();
const mockClearAllTables = jest.fn();
const mockCancelAllScheduledNotifications = jest.fn();
const mockClearReminderSeriesConfigs = jest.fn();
const mockResetBadgeCount = jest.fn();
const mockClearNotificationPreferences = jest.fn();
const mockDeleteRemoteUserData = jest.fn();
const mockClearPendingRemoteReset = jest.fn();
const mockSetPendingRemoteReset = jest.fn();
const mockResetCursors = jest.fn();
const mockFriendlyError = jest.fn();
const mockToast = { show: jest.fn(), messages: [], dismiss: jest.fn() };

const mockSessionState = {
  status: 'unauthenticated' as 'authenticated' | 'unauthenticated',
  session: null as null | { user?: { id?: string; email?: string } },
  signOut: mockSignOut,
  isLoading: false,
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('@/auth/session', () => ({
  useSessionStore: (selector: (state: typeof mockSessionState) => unknown) =>
    selector(mockSessionState),
}));

jest.mock('@/state', () => ({
  useSyncStore: {
    getState: () => ({
      setQueueSize: mockSetQueueSize,
    }),
  },
}));

jest.mock('@/auth/reset', () => ({
  clearPendingRemoteReset: (...args: unknown[]) => mockClearPendingRemoteReset(...args),
  deleteRemoteUserData: (...args: unknown[]) => mockDeleteRemoteUserData(...args),
  setPendingRemoteReset: (...args: unknown[]) => mockSetPendingRemoteReset(...args),
}));

jest.mock('@/db/sqlite', () => ({
  clearAllTables: (...args: unknown[]) => mockClearAllTables(...args),
  hasData: (...args: unknown[]) => mockHasData(...args),
}));

jest.mock('@/notifications/notifications', () => ({
  cancelAllScheduledNotifications: (...args: unknown[]) =>
    mockCancelAllScheduledNotifications(...args),
  resetBadgeCount: (...args: unknown[]) => mockResetBadgeCount(...args),
}));

jest.mock('@/notifications/scheduler', () => ({
  clearReminderSeriesConfigs: (...args: unknown[]) => mockClearReminderSeriesConfigs(...args),
}));

jest.mock('@/notifications/preferences', () => ({
  clearNotificationPreferences: (...args: unknown[]) => mockClearNotificationPreferences(...args),
}));

jest.mock('@/sync/cursors', () => ({
  resetCursors: (...args: unknown[]) => mockResetCursors(...args),
}));

jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: () => mockFriendlyError,
}));

jest.mock('@/observability/logger', () => ({
  createLogger: () => ({
    error: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/ui', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  const ScreenContainer = ({ children }: { children: any }) =>
    React.createElement(View, null, children);
  ScreenContainer.displayName = 'ScreenContainer';

  const SettingsSection = ({ title, children, description }: any) =>
    React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      description ? React.createElement(Text, null, description) : null,
      children,
    );
  SettingsSection.displayName = 'SettingsSection';

  const PrimaryButton = ({ children, onPress, disabled, testID }: any) =>
    React.createElement(
      Pressable,
      { onPress: disabled ? undefined : onPress, testID },
      React.createElement(Text, null, children),
    );
  PrimaryButton.displayName = 'PrimaryButton';

  const SecondaryButton = ({ children, onPress, disabled, testID }: any) =>
    React.createElement(
      Pressable,
      { onPress: disabled ? undefined : onPress, testID },
      React.createElement(Text, null, children),
    );
  SecondaryButton.displayName = 'SecondaryButton';

  const ToastContainer = ({ messages }: any) =>
    React.createElement(View, null, React.createElement(Text, null, String(messages?.length)));
  ToastContainer.displayName = 'ToastContainer';

  return {
    ScreenContainer,
    SettingsSection,
    PrimaryButton,
    SecondaryButton,
    ToastContainer,
    useToast: () => mockToast,
  };
});

jest.mock('tamagui', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const Dialog = ({ children }: any) => React.createElement(View, null, children);
  Dialog.displayName = 'Dialog';
  const DialogPortal = ({ children }: any) => React.createElement(View, null, children);
  DialogPortal.displayName = 'Dialog.Portal';
  const DialogOverlay = () => React.createElement(View, null);
  DialogOverlay.displayName = 'Dialog.Overlay';
  const DialogContent = ({ children }: any) => React.createElement(View, null, children);
  DialogContent.displayName = 'Dialog.Content';
  const DialogTitle = ({ children }: any) => React.createElement(Text, null, children);
  DialogTitle.displayName = 'Dialog.Title';
  const DialogDescription = ({ children }: any) => React.createElement(Text, null, children);
  DialogDescription.displayName = 'Dialog.Description';

  Dialog.Portal = DialogPortal;
  Dialog.Overlay = DialogOverlay;
  Dialog.Content = DialogContent;
  Dialog.Title = DialogTitle;
  Dialog.Description = DialogDescription;

  const Spinner = () => React.createElement(View, null);
  Spinner.displayName = 'Spinner';

  const XStack = ({ children }: any) => React.createElement(View, null, children);
  XStack.displayName = 'XStack';

  const YStack = ({ children }: any) => React.createElement(View, null, children);
  YStack.displayName = 'YStack';

  return {
    Dialog,
    Spinner,
    XStack,
    YStack,
  };
});

import AccountSettingsScreen from '../../../../app/(tabs)/settings/account';

const setPlatform = (value: string) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value });
};

describe('AccountSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionState.status = 'unauthenticated';
    mockSessionState.session = null;
    mockSessionState.isLoading = false;
    mockSessionState.signOut = mockSignOut;
    mockFriendlyError.mockReturnValue({ friendly: {} });
    mockHasData.mockResolvedValue(false);
    mockClearAllTables.mockResolvedValue(undefined);
    mockCancelAllScheduledNotifications.mockResolvedValue(undefined);
    mockClearReminderSeriesConfigs.mockResolvedValue(undefined);
    mockResetBadgeCount.mockResolvedValue(undefined);
    mockClearNotificationPreferences.mockResolvedValue(undefined);
    mockDeleteRemoteUserData.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockSetPendingRemoteReset.mockResolvedValue(undefined);
    mockClearPendingRemoteReset.mockResolvedValue(undefined);
    setPlatform('web');
  });

  it('navigates to login when unauthenticated', () => {
    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.signIn'));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('signs out and redirects to root on web when authenticated', async () => {
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-1', email: 'me@example.com' } };

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.signOut'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('resets local data when no user id is present', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = null;

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(mockClearAllTables).toHaveBeenCalled();
      expect(mockSetPendingRemoteReset).toHaveBeenCalledWith(true);
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  it('resets remote data when a user id exists', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-2', email: 'me@example.com' } };

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(mockDeleteRemoteUserData).toHaveBeenCalledWith('user-2');
      expect(mockClearPendingRemoteReset).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
  });
});
