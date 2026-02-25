import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';

import { NOTIFICATION_PERMISSION_STATE, NOTIFICATION_STATUS } from '@/notifications/status';

const mockTryPromptForPush = jest.fn();
const mockDisablePushNotifications = jest.fn();
const mockNotificationState: any = {
  permissionStatus: NOTIFICATION_PERMISSION_STATE.PROMPT,
  notificationStatus: NOTIFICATION_STATUS.UNKNOWN,
  pushManuallyDisabled: false,
  isSupported: true,
  tryPromptForPush: mockTryPromptForPush,
  disablePushNotifications: mockDisablePushNotifications,
  error: null as string | null,
  pushError: null as string | null,
  isChecking: false,
};

jest.mock('@/notifications/useNotificationSettings', () => ({
  useNotificationSettings: () => mockNotificationState,
}));

jest.mock('@/ui', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  const ScreenContainer = ({ children }: { children: any }) =>
    React.createElement(View, null, children);
  ScreenContainer.displayName = 'ScreenContainer';

  const SettingsSection = ({ title, children }: any) =>
    React.createElement(View, null, React.createElement(Text, null, title), children);
  SettingsSection.displayName = 'SettingsSection';

  const PrimaryButton = ({ children, onPress, disabled, testID }: any) =>
    React.createElement(
      Pressable,
      { onPress: disabled ? undefined : onPress, testID },
      React.createElement(Text, null, children),
    );
  PrimaryButton.displayName = 'PrimaryButton';

  return {
    ScreenContainer,
    SettingsSection,
    PrimaryButton,
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('tamagui', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const Paragraph = ({ children, testID }: any) => React.createElement(Text, { testID }, children);
  Paragraph.displayName = 'Paragraph';

  const Switch = ({ testID, onCheckedChange, ...rest }: any) =>
    React.createElement(View, { testID, onCheckedChange, ...rest });
  Switch.displayName = 'Switch';
  const SwitchThumb = () => React.createElement(View, null);
  SwitchThumb.displayName = 'Switch.Thumb';
  Switch.Thumb = SwitchThumb;

  const XStack = ({ children }: any) => React.createElement(View, null, children);
  XStack.displayName = 'XStack';

  const YStack = ({ children }: any) => React.createElement(View, null, children);
  YStack.displayName = 'YStack';

  return {
    Paragraph,
    Switch,
    View,
    XStack,
    YStack,
  };
});

import NotificationSettingsScreen from '../../../../app/(tabs)/settings/notifications';

const setPlatform = (value: string) => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value });
};

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('ios');
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.PROMPT;
    mockNotificationState.notificationStatus = NOTIFICATION_STATUS.UNKNOWN;
    mockNotificationState.pushManuallyDisabled = false;
    mockNotificationState.isSupported = true;
    mockNotificationState.pushError = null;
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
  });

  it('shows blocked message and opens settings when blocked on native', () => {
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.BLOCKED;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    fireEvent.press(getByTestId('open-notification-settings-button'));

    expect(openSettingsSpy).toHaveBeenCalled();
    openSettingsSpy.mockRestore();
  });

  it('disables push notifications when toggle is turned off', () => {
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.GRANTED;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    fireEvent(getByTestId('settings-push-toggle'), 'onCheckedChange', false);

    expect(mockDisablePushNotifications).toHaveBeenCalled();
  });

  it('shows enabled status when firebase is on and granted', async () => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    mockNotificationState.notificationStatus = NOTIFICATION_STATUS.GRANTED;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    await waitFor(() => {
      expect(getByTestId('settings-push-status').props.children).toBe(
        'settings.pushStatusEnabledSimple',
      );
    });
  });

  it('shows disabled text when firebase is on and status is soft declined', () => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    mockNotificationState.notificationStatus = NOTIFICATION_STATUS.SOFT_DECLINED;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    expect(getByTestId('settings-push-status').props.children).toBe(
      'settings.pushStatusDisabledSimple',
    );
  });

  it('shows disabled text when firebase is on and status is unknown', () => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    mockNotificationState.notificationStatus = NOTIFICATION_STATUS.UNKNOWN;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    expect(getByTestId('settings-push-status').props.children).toBe(
      'settings.pushStatusDisabledSimple',
    );
  });

  it('calls tryPromptForPush when toggle is turned on and result is denied', async () => {
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.GRANTED;
    mockTryPromptForPush.mockResolvedValue({ status: NOTIFICATION_STATUS.DENIED });

    const { getByTestId } = render(<NotificationSettingsScreen />);

    fireEvent(getByTestId('settings-push-toggle'), 'onCheckedChange', true);

    await waitFor(() => {
      expect(mockTryPromptForPush).toHaveBeenCalledWith({
        context: 'manual',
        skipSoftPrompt: true,
      });
    });
  });

  it('shows push error text when present', () => {
    mockNotificationState.pushError = 'Push error';

    const { getByTestId } = render(<NotificationSettingsScreen />);

    expect(getByTestId('settings-push-status').props.children).toBe('Push error');
  });

  it('shows enabled text when firebase is off and permission granted', () => {
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.GRANTED;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    expect(getByTestId('settings-push-status').props.children).toBe(
      'settings.pushStatusEnabledSimple',
    );
  });

  it('shows disabled text when firebase is on and status is denied', () => {
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
    mockNotificationState.notificationStatus = NOTIFICATION_STATUS.DENIED;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    expect(getByTestId('settings-push-status').props.children).toBe(
      'settings.pushStatusDisabledSimple',
    );
  });

  it('requests push permissions when toggle is turned on', async () => {
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.GRANTED;
    mockTryPromptForPush.mockResolvedValue({ status: 'triggered' });

    const { getByTestId } = render(<NotificationSettingsScreen />);

    fireEvent(getByTestId('settings-push-toggle'), 'onCheckedChange', true);

    await waitFor(() => {
      expect(mockTryPromptForPush).toHaveBeenCalledWith({
        context: 'manual',
        skipSoftPrompt: true,
      });
    });
  });

  it('shows disabled text when permission granted but push manually disabled', () => {
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.GRANTED;
    mockNotificationState.pushManuallyDisabled = true;

    const { getByTestId } = render(<NotificationSettingsScreen />);

    expect(getByTestId('settings-push-status').props.children).toBe(
      'settings.pushStatusDisabledSimple',
    );
  });

  it('shows mobile-web disabled message and hides toggle on mobile web', () => {
    setPlatform('web');
    mockNotificationState.isSupported = false;

    const { getByTestId, queryByTestId } = render(<NotificationSettingsScreen />);

    expect(getByTestId('settings-notification-mobile-web').props.children).toBe(
      'settings.pushStatusMobileWebDisabled',
    );
    expect(queryByTestId('settings-push-toggle')).toBeNull();
  });

  it('does not show open settings button on web when blocked', () => {
    setPlatform('web');
    mockNotificationState.permissionStatus = NOTIFICATION_PERMISSION_STATE.BLOCKED;

    const { queryByTestId } = render(<NotificationSettingsScreen />);

    expect(queryByTestId('open-notification-settings-button')).toBeNull();
  });
});
