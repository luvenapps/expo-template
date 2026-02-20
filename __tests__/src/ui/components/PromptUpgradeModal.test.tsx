import { PromptUpgradeModal } from '@/ui/components/PromptUpgradeModal';
import type { FriendlyError } from '@/errors/friendly';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockHandleError = jest.fn<{ friendly: FriendlyError }, []>(() => ({
  friendly: { code: 'unknown', title: 'Error', type: 'error' },
}));

jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: () => mockHandleError,
}));

let mockOnOpenChange: ((open: boolean) => void) | null = null;

jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const Dialog: any = ({ children, onOpenChange }: any) => {
    React.useEffect(() => {
      mockOnOpenChange = onOpenChange;
    }, [onOpenChange]);
    return React.createElement(RN.View, null, children);
  };
  Dialog.displayName = 'Dialog';
  const DialogPortal = ({ children }: any) => React.createElement(RN.View, null, children);
  DialogPortal.displayName = 'Dialog.Portal';
  Dialog.Portal = DialogPortal;
  const DialogOverlay = () => null;
  DialogOverlay.displayName = 'Dialog.Overlay';
  Dialog.Overlay = DialogOverlay;
  const DialogContent = ({ children }: any) => React.createElement(RN.View, null, children);
  DialogContent.displayName = 'Dialog.Content';
  Dialog.Content = DialogContent;
  const DialogTitle = ({ children, asChild }: any) =>
    asChild ? children : React.createElement(RN.View, null, children);
  DialogTitle.displayName = 'Dialog.Title';
  Dialog.Title = DialogTitle;
  const DialogDescription = ({ children, asChild }: any) =>
    asChild ? children : React.createElement(RN.View, null, children);
  DialogDescription.displayName = 'Dialog.Description';
  Dialog.Description = DialogDescription;
  const Paragraph = ({ children, testID, ...props }: any) =>
    React.createElement(RN.Text, { testID, ...props }, children);
  const YStack = ({ children, ...props }: any) => React.createElement(RN.View, props, children);
  const XStack = ({ children, ...props }: any) => React.createElement(RN.View, props, children);
  const Button = ({ children, ...props }: any) =>
    React.createElement(RN.TouchableOpacity, props, React.createElement(RN.Text, null, children));

  return {
    Dialog,
    Paragraph,
    YStack,
    XStack,
    Button,
    useTheme: () => ({
      color: { get: () => '#111' },
    }),
  };
});

jest.mock('@/ui/components/PrimaryButton', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const PrimaryButton = ({ children, ...props }: any) =>
    React.createElement(RN.TouchableOpacity, props, React.createElement(RN.Text, null, children));
  return {
    PrimaryButton,
  };
});

describe('PromptUpgradeModal', () => {
  const canOpenUrlSpy = jest.spyOn(Linking, 'canOpenURL');
  const openUrlSpy = jest.spyOn(Linking, 'openURL');

  beforeEach(() => {
    jest.clearAllMocks();
    canOpenUrlSpy.mockResolvedValue(true);
    openUrlSpy.mockResolvedValue(undefined);
    (Constants as any).expoConfig = {
      extra: {
        storeIds: {
          ios: '1234567890',
          android: 'com.example.test',
        },
      },
    };
    mockHandleError.mockReturnValue({
      friendly: { code: 'unknown', title: 'Error', type: 'error' },
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('dismisses when not now is pressed', () => {
    const onNotNow = jest.fn();
    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={onNotNow}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-not-now'));
    mockOnOpenChange?.(false);

    expect(onNotNow).toHaveBeenCalledTimes(2);
  });

  it('tries fallback store URLs when the first URL cannot open', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    canOpenUrlSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalledTimes(2);
      expect(openUrlSpy).toHaveBeenCalledTimes(1);
      expect(openUrlSpy).toHaveBeenCalledWith(
        'https://play.google.com/store/apps/details?id=com.example.test',
      );
    });
  });

  it('continues to fallback URL when canOpenURL throws', async () => {
    canOpenUrlSpy.mockRejectedValueOnce(new Error('bad-url')).mockResolvedValueOnce(true);

    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalledTimes(2);
      expect(openUrlSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('uses generic store links when store identifiers are missing', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    (Constants as any).expoConfig.extra.storeIds = {};

    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalledWith('https://play.google.com/store');
    });
  });

  it('uses generic store links when expo config is unavailable', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });
    (Constants as any).expoConfig = undefined;

    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalledWith('https://play.google.com/store');
    });
  });

  it('falls back to unknown error title when handler has no friendly title or keys', async () => {
    canOpenUrlSpy.mockResolvedValue(false);
    mockHandleError.mockReturnValue({ friendly: { code: 'unknown', type: 'error' } });

    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('prompt-upgrade-error').props.children).toBe('errors.unknown.title');
    });
  });

  it('uses friendly descriptionKey when available', async () => {
    canOpenUrlSpy.mockResolvedValue(false);
    mockHandleError.mockReturnValue({
      friendly: {
        code: 'network.offline',
        titleKey: 'errors.network.offline.title',
        descriptionKey: 'errors.network.offline.description',
        type: 'error',
      },
    });

    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('prompt-upgrade-error').props.children).toBe(
        'errors.network.offline.description',
      );
    });
  });

  it('shows an inline error when no store URL can be opened', async () => {
    canOpenUrlSpy.mockResolvedValue(false);

    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={jest.fn()}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('prompt-upgrade-error')).toBeTruthy();
    });
    expect(mockHandleError).toHaveBeenCalled();
  });

  it('does not dismiss when dialog closes without explicit not now action', () => {
    const onNotNow = jest.fn();

    render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={onNotNow}
      />,
    );

    mockOnOpenChange?.(false);

    expect(onNotNow).not.toHaveBeenCalled();
  });

  it('opens the app store when update is pressed', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const onNotNow = jest.fn();
    const { getByTestId } = render(
      <PromptUpgradeModal
        open
        title="Update available"
        message="Please update soon"
        actionLabel="Update"
        notNowLabel="Not now"
        onNotNow={onNotNow}
      />,
    );

    fireEvent.press(getByTestId('prompt-upgrade-action'));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalled();
      expect(openUrlSpy).toHaveBeenCalled();
    });
  });
});
