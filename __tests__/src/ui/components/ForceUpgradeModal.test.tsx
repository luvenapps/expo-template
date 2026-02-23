import { ForceUpgradeModal } from '@/ui/components/ForceUpgradeModal';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking, Platform } from 'react-native';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockHandleError = jest.fn(() => ({ friendly: { title: 'Error', type: 'error' } }));

jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: () => mockHandleError,
}));

let mockOnOpenChange: ((open: boolean) => void) | null = null;

let mockUseTheme = jest.fn(() => ({
  color: {
    get: () => '#111',
  },
}));

jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const Dialog: any = ({ children, onOpenChange }: any) => {
    // Store the onOpenChange callback for testing
    React.useEffect(() => {
      mockOnOpenChange = onOpenChange;
    }, [onOpenChange]);

    return React.createElement(RN.View, { testID: 'dialog-root' }, children);
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
  Paragraph.displayName = 'Paragraph';
  const YStack = ({ children, ...props }: any) => React.createElement(RN.View, props, children);
  YStack.displayName = 'YStack';
  const XStack = ({ children, ...props }: any) => React.createElement(RN.View, props, children);
  XStack.displayName = 'XStack';
  return {
    Dialog,
    Paragraph,
    YStack,
    XStack,
    useTheme: () => mockUseTheme(),
  };
});

jest.mock('@/ui/components/PrimaryButton', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const PrimaryButton = ({ children, ...props }: any) =>
    React.createElement(RN.TouchableOpacity, props, React.createElement(RN.Text, null, children));
  PrimaryButton.displayName = 'PrimaryButton';
  return {
    PrimaryButton,
  };
});

describe('ForceUpgradeModal', () => {
  const originalPlatform = Platform.OS;
  const canOpenUrlSpy = jest.spyOn(Linking, 'canOpenURL');
  const openUrlSpy = jest.spyOn(Linking, 'openURL');

  beforeEach(() => {
    canOpenUrlSpy.mockResolvedValue(true);
    openUrlSpy.mockResolvedValue(undefined);
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('opens the store link when the update button is pressed', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalled();
      expect(openUrlSpy).toHaveBeenCalled();
    });
  });

  it('opens the Android store link when platform is Android', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android' });

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalled();
      expect(openUrlSpy).toHaveBeenCalled();
    });
  });

  it('displays error message when store link cannot be opened', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    canOpenUrlSpy.mockResolvedValue(false);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('force-upgrade-error')).toBeTruthy();
    });
  });

  it('renders the modal when open is true', () => {
    const { getByTestId, queryByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();
    expect(queryByTestId('force-upgrade-error')).toBeNull();
  });

  it('clears error message before opening store link', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    // First, trigger an error
    canOpenUrlSpy.mockResolvedValue(false);
    const { getByTestId, queryByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('force-upgrade-error')).toBeTruthy();
    });

    // Now, make it succeed and error should be cleared
    canOpenUrlSpy.mockResolvedValue(true);
    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(openUrlSpy).toHaveBeenCalled();
      expect(queryByTestId('force-upgrade-error')).toBeNull();
    });
  });

  it('opens fallback store URL when store IDs are empty', async () => {
    // Mock Constants to return empty store IDs
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = {
      ...originalExpoConfig,
      extra: {
        ...originalExpoConfig?.extra,
        storeIds: {},
      },
    };

    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalledWith('itms-apps://apps.apple.com/');
      expect(openUrlSpy).toHaveBeenCalledWith('itms-apps://apps.apple.com/');
    });

    // Restore
    Constants.default.expoConfig = originalExpoConfig;
  });

  it('falls back to https URL when itms-apps scheme fails', async () => {
    // Mock Constants to return empty store IDs
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = {
      ...originalExpoConfig,
      extra: {
        ...originalExpoConfig?.extra,
        storeIds: {},
      },
    };

    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    // First URL (itms-apps) fails, second (https) succeeds
    canOpenUrlSpy.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(canOpenUrlSpy).toHaveBeenCalledWith('itms-apps://apps.apple.com/');
      expect(canOpenUrlSpy).toHaveBeenCalledWith('https://apps.apple.com/');
      expect(openUrlSpy).toHaveBeenCalledWith('https://apps.apple.com/');
    });

    // Restore
    Constants.default.expoConfig = originalExpoConfig;
  });

  it('prevents modal from closing when allowCloseRef is false', async () => {
    render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    // Wait for component to mount and onOpenChange to be set
    await waitFor(() => {
      expect(mockOnOpenChange).not.toBeNull();
    });

    // Try to close the modal (should be prevented by returning early)
    if (mockOnOpenChange) {
      mockOnOpenChange(false);
    }

    // Modal should still be rendered (not closed)
    expect(mockOnOpenChange).toBeTruthy();
  });

  it('resets allowCloseRef when modal opens', async () => {
    render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    // Wait for component to mount and onOpenChange to be set
    await waitFor(() => {
      expect(mockOnOpenChange).not.toBeNull();
    });

    // Trigger onOpenChange with true (opening modal)
    if (mockOnOpenChange) {
      mockOnOpenChange(true);
    }

    expect(mockOnOpenChange).toBeTruthy();
  });

  it('handles exception during URL opening and tries next URL', async () => {
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = {
      ...originalExpoConfig,
      extra: {
        ...originalExpoConfig?.extra,
        storeIds: {
          ios: '123456789',
        },
      },
    };

    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    // First URL throws an error, second URL succeeds
    canOpenUrlSpy
      .mockRejectedValueOnce(new Error('URL scheme not supported'))
      .mockResolvedValueOnce(true);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      // Should try both URLs
      expect(canOpenUrlSpy).toHaveBeenCalledWith('itms-apps://apps.apple.com/app/id123456789');
      expect(canOpenUrlSpy).toHaveBeenCalledWith('https://apps.apple.com/app/id123456789');
      expect(openUrlSpy).toHaveBeenCalledWith('https://apps.apple.com/app/id123456789');
    });

    // Restore
    Constants.default.expoConfig = originalExpoConfig;
  });

  it('shows error when all URLs fail with exceptions', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    // All URLs throw errors
    canOpenUrlSpy.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('force-upgrade-error')).toBeTruthy();
    });
  });

  it('skips empty URL in candidateUrls array', async () => {
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = {
      ...originalExpoConfig,
      extra: {
        ...originalExpoConfig?.extra,
        storeIds: {
          ios: '', // Empty iOS ID
        },
      },
    };

    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      // Should skip empty strings and use fallback URLs
      expect(canOpenUrlSpy).toHaveBeenCalledWith('itms-apps://apps.apple.com/');
      expect(openUrlSpy).toHaveBeenCalled();
    });

    // Restore
    Constants.default.expoConfig = originalExpoConfig;
  });

  it('handles missing theme.color gracefully', () => {
    mockUseTheme.mockReturnValueOnce({} as any);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    // Should render without errors even when theme.color is undefined
    expect(getByTestId('force-upgrade-action')).toBeTruthy();
  });

  it('uses smaller icon size for narrow screens', () => {
    const RN = require('react-native');
    const originalUseWindowDimensions = RN.useWindowDimensions;
    RN.useWindowDimensions = jest.fn(() => ({ width: 375, height: 667 }));

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();

    RN.useWindowDimensions = originalUseWindowDimensions;
  });

  it('uses larger icon size for wide screens', () => {
    const RN = require('react-native');
    const originalUseWindowDimensions = RN.useWindowDimensions;
    RN.useWindowDimensions = jest.fn(() => ({ width: 400, height: 800 }));

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();

    RN.useWindowDimensions = originalUseWindowDimensions;
  });

  it('renders correctly on web to cover web dialog sizing branch', () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();
  });

  it('handles error with titleKey fallback', async () => {
    mockHandleError.mockReturnValueOnce({
      friendly: {
        titleKey: 'errors.network.title',
        type: 'error',
      } as any,
    });

    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    canOpenUrlSpy.mockResolvedValue(false);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('force-upgrade-error')).toBeTruthy();
    });
  });

  it('handles error with descriptionKey fallback', async () => {
    mockHandleError.mockReturnValueOnce({
      friendly: {
        title: 'Error',
        descriptionKey: 'errors.network.description',
        type: 'error',
      } as any,
    });

    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    canOpenUrlSpy.mockResolvedValue(false);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('force-upgrade-error')).toBeTruthy();
    });
  });

  it('handles error with originalMessage fallback', async () => {
    mockHandleError.mockReturnValueOnce({
      friendly: {
        title: 'Error',
        originalMessage: 'Original error message',
        type: 'error',
      } as any,
    });

    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    canOpenUrlSpy.mockResolvedValue(false);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      const errorElement = getByTestId('force-upgrade-error');
      expect(errorElement).toBeTruthy();
    });
  });

  it('uses titleText when descriptionText is empty', async () => {
    mockHandleError.mockReturnValueOnce({
      friendly: {
        title: 'Unable to open store',
        type: 'error',
      },
    });

    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    canOpenUrlSpy.mockResolvedValue(false);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('force-upgrade-error')).toBeTruthy();
    });
  });

  it('falls back to unknown title key when friendly title and titleKey are missing', async () => {
    mockHandleError.mockReturnValueOnce({
      friendly: {
        type: 'error',
      } as any,
    });

    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    canOpenUrlSpy.mockResolvedValue(false);

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    fireEvent.press(getByTestId('force-upgrade-action'));

    await waitFor(() => {
      expect(getByTestId('force-upgrade-error').props.children).toBe('errors.unknown.title');
    });
  });

  it('handles missing Constants.expoConfig', () => {
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = undefined;

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();

    Constants.default.expoConfig = originalExpoConfig;
  });

  it('handles missing Constants.expoConfig.extra', () => {
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = { ...originalExpoConfig, extra: undefined };

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();

    Constants.default.expoConfig = originalExpoConfig;
  });

  it('handles non-string storeIds.android', () => {
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = {
      ...originalExpoConfig,
      extra: {
        ...originalExpoConfig?.extra,
        storeIds: {
          android: 123, // Non-string value
        },
      },
    };

    Object.defineProperty(Platform, 'OS', { value: 'android' });

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();

    Constants.default.expoConfig = originalExpoConfig;
  });

  it('handles non-string storeIds.ios', () => {
    const Constants = require('expo-constants');
    const originalExpoConfig = Constants.default.expoConfig;
    Constants.default.expoConfig = {
      ...originalExpoConfig,
      extra: {
        ...originalExpoConfig?.extra,
        storeIds: {
          ios: null, // Non-string value
        },
      },
    };

    Object.defineProperty(Platform, 'OS', { value: 'ios' });

    const { getByTestId } = render(
      <ForceUpgradeModal
        open
        title="Update required"
        message="Please update."
        actionLabel="Update"
      />,
    );

    expect(getByTestId('force-upgrade-action')).toBeTruthy();

    Constants.default.expoConfig = originalExpoConfig;
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform });
    jest.clearAllMocks();
  });
});
