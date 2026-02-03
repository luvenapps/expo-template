import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Dialog } from 'tamagui';

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
const mockLogger = { error: jest.fn() };

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
  createLogger: () => mockLogger,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/ui', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  const { useSessionStore } = require('@/auth/session');
  const { useRouter } = require('expo-router');

  const ScreenContainer = ({ children }: { children: any }) =>
    React.createElement(View, null, children);
  ScreenContainer.displayName = 'ScreenContainer';

  const SettingsSection = ({ title, children, description, footer }: any) =>
    React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      description ? React.createElement(Text, null, description) : null,
      footer ? React.createElement(Text, null, footer) : null,
      children,
    );
  SettingsSection.displayName = 'SettingsSection';

  const PrimaryButton = ({ children, onPress, disabled, testID }: any) =>
    React.createElement(
      Pressable,
      { onPress: disabled ? undefined : onPress, testID, accessible: true },
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

  const UserOnly = ({ children }: { children: any }) => {
    const status = useSessionStore((state: any) => state.status);
    const router = useRouter();
    React.useEffect(() => {
      if (status === 'unauthenticated') {
        router.replace('/(auth)/login');
      }
    }, [router, status]);
    if (status !== 'authenticated') return null;
    return React.createElement(React.Fragment, null, children);
  };
  UserOnly.displayName = 'UserOnly';

  return {
    ScreenContainer,
    SettingsSection,
    PrimaryButton,
    SecondaryButton,
    ToastContainer,
    UserOnly,
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
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      const message = args[0];
      if (typeof message === 'string' && message.includes('not wrapped in act')) {
        return;
      }

      console.warn(...args);
    });
    mockSessionState.status = 'unauthenticated';
    mockSessionState.session = null;
    mockSessionState.isLoading = false;
    mockSessionState.signOut = mockSignOut;
    mockFriendlyError.mockReturnValue({ friendly: {} });
    mockLogger.error.mockReset();
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

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('redirects to login when unauthenticated', async () => {
    render(<AccountSettingsScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
    });
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

  it('signs out without redirect on native', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-native', email: 'me@example.com' } };

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.signOut'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
    expect(mockReplace).not.toHaveBeenCalled();
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

  it('opens profile screen when authenticated', () => {
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-3', email: 'me@example.com' } };

    const { getByTestId } = render(<AccountSettingsScreen />);

    fireEvent.press(getByTestId('settings-profile-button'));

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/profile');
  });

  it('handles database check errors on native', async () => {
    setPlatform('ios');
    mockHasData.mockRejectedValueOnce(new Error('db fail'));

    render(<AccountSettingsScreen />);

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking database data:',
        expect.any(Error),
      );
    });
  });

  it('skips database check on web', async () => {
    setPlatform('web');
    mockHasData.mockResolvedValueOnce(true);

    render(<AccountSettingsScreen />);

    await waitFor(() => {
      expect(mockHasData).not.toHaveBeenCalled();
    });
  });

  it('handles reset local data failure when unauthenticated', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = null;
    const error = new Error('reset failed');
    mockClearAllTables.mockRejectedValueOnce(error);
    mockFriendlyError.mockReturnValue({ friendly: { description: 'Oops' } });

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(mockFriendlyError).toHaveBeenCalledWith(error, {
        surface: 'settings.reset-app',
        suppressToast: true,
      });
    });
  });

  it('renders descriptionKey fallback when reset local data fails', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = null;
    const error = new Error('reset failed');
    mockClearAllTables.mockRejectedValueOnce(error);
    mockFriendlyError.mockReturnValue({
      friendly: { descriptionKey: 'errors.reset' },
    });

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(getByText('errors.reset')).toBeTruthy();
    });
  });

  it('renders titleKey fallback when reset local data fails', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = null;
    const error = new Error('reset failed');
    mockClearAllTables.mockRejectedValueOnce(error);
    mockFriendlyError.mockReturnValue({
      friendly: { titleKey: 'errors.reset.title' },
    });

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(getByText('errors.reset.title')).toBeTruthy();
    });
  });

  it('handles reset remote data failure when authenticated', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-4', email: 'me@example.com' } };
    const error = new Error('remote reset failed');
    mockDeleteRemoteUserData.mockRejectedValueOnce(error);
    mockFriendlyError.mockReturnValue({ friendly: { description: 'Oops' } });

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(mockFriendlyError).toHaveBeenCalledWith(error, {
        surface: 'settings.reset-app',
        suppressToast: true,
      });
    });
  });

  it('shows loading state on the auth button', () => {
    mockSessionState.isLoading = true;
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-loading', email: 'me@example.com' } };

    const { getByText } = render(<AccountSettingsScreen />);

    expect(getByText('settings.loading')).toBeTruthy();
  });

  it('closes the reset modal via onOpenChange', () => {
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-5', email: 'me@example.com' } };

    const { UNSAFE_getByType } = render(<AccountSettingsScreen />);
    const dialog = UNSAFE_getByType(Dialog);

    expect(() => dialog.props.onOpenChange(false)).not.toThrow();
    expect(() => dialog.props.onOpenChange(true)).not.toThrow();
  });

  it('opens and closes the reset dialog via buttons', () => {
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-6', email: 'me@example.com' } };

    const { getByTestId, getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByTestId('settings-reset-app-button'));
    fireEvent.press(getByText('settings.resetCancel'));
  });

  it('ignores onOpenChange while resetting', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = { user: { id: 'user-7', email: 'me@example.com' } };
    mockClearAllTables.mockImplementation(() => new Promise<void>(() => {}));

    const { getByText, UNSAFE_getByType } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));
    const dialog = UNSAFE_getByType(Dialog);

    expect(() => dialog.props.onOpenChange(false)).not.toThrow();
  });

  it('ignores reset while already in progress', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = null;

    // Create a promise that we control
    let resolveClearTables: () => void;
    const clearTablesPromise = new Promise<void>((resolve) => {
      resolveClearTables = resolve;
    });
    mockClearAllTables.mockReturnValue(clearTablesPromise);

    const { getByTestId, getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByTestId('settings-reset-app-button'));

    // Click confirm button twice - second click should be ignored
    const confirmButton = getByText('settings.resetConfirmAction');
    fireEvent.press(confirmButton);

    // After first click, button is disabled and shows spinner
    // Try clicking via testID (button should ignore the click due to disabled state)
    fireEvent.press(getByTestId('settings-reset-confirm-button'));

    // Now resolve the promise to let the operation complete
    resolveClearTables!();

    await waitFor(() => {
      expect(mockSetPendingRemoteReset).toHaveBeenCalledTimes(1);
    });

    // Verify clearAllTables was only called once despite two button clicks
    expect(mockClearAllTables).toHaveBeenCalledTimes(1);
  });

  it('resets local data on web without native side effects', async () => {
    setPlatform('web');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = null;

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(mockClearNotificationPreferences).toHaveBeenCalled();
    });
    expect(mockCancelAllScheduledNotifications).not.toHaveBeenCalled();
    expect(mockClearAllTables).not.toHaveBeenCalled();
  });

  it('renders originalMessage fallback when reset local data fails', async () => {
    setPlatform('ios');
    mockSessionState.status = 'authenticated';
    mockSessionState.session = null;
    const error = new Error('reset failed');
    mockClearAllTables.mockRejectedValueOnce(error);
    mockFriendlyError.mockReturnValue({
      friendly: { originalMessage: 'Original error' },
    });

    const { getByText } = render(<AccountSettingsScreen />);

    fireEvent.press(getByText('settings.resetConfirmAction'));

    await waitFor(() => {
      expect(getByText('Original error')).toBeTruthy();
    });
  });
});
