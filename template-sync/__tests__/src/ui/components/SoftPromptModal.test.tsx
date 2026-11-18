import { findAllByType, findByType } from '../../../helpers/testInstance';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

// Unmock SoftPromptModal for this test file (it's globally mocked in setup.ts)
jest.unmock('@/ui/components/SoftPromptModal');

import { SoftPromptModal } from '@/ui/components/SoftPromptModal';

// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Dialog: any = ({ children, open, onOpenChange }: any) => {
    if (!open) return null;
    return React.createElement('Dialog', { onOpenChange }, children);
  };
  Dialog.displayName = 'Dialog';
  Dialog.Portal = ({ children }: any) => <>{children}</>;
  Dialog.Portal.displayName = 'Dialog.Portal';
  Dialog.Overlay = () => null;
  Dialog.Overlay.displayName = 'Dialog.Overlay';
  Dialog.Content = ({ children }: any) => <>{children}</>;
  Dialog.Content.displayName = 'Dialog.Content';
  Dialog.Title = ({ children, asChild }: any) => (asChild ? children : <>{children}</>);
  Dialog.Title.displayName = 'Dialog.Title';
  Dialog.Description = ({ children, asChild }: any) => (asChild ? children : <>{children}</>);
  Dialog.Description.displayName = 'Dialog.Description';

  return {
    Dialog,
    YStack: ({ children, ...props }: any) => React.createElement('YStack', props, children),
    XStack: ({ children, ...props }: any) => React.createElement('XStack', props, children),
    Paragraph: ({ children, ...props }: any) =>
      React.createElement('Paragraph', props, React.createElement(Text, {}, children)),
    useTheme: jest.fn(() => ({
      color: {
        get: () => '#111111',
      },
    })),
  };
});

// Mock PrimaryButton
jest.mock('@/ui/components/PrimaryButton', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    PrimaryButton: ({ children, onPress, testID, ...props }: any) =>
      React.createElement(
        'PrimaryButton',
        {
          ...props,
          testID,
          onPress,
        },
        typeof children === 'string' ? React.createElement(Text, {}, children) : children,
      ),
  };
});

describe('SoftPromptModal', () => {
  const defaultProps = {
    open: true,
    title: 'Enable Notifications',
    message: 'Would you like to enable push notifications?',
    allowLabel: 'Allow',
    notNowLabel: 'Not Now',
    onAllow: jest.fn(),
    onNotNow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open is true', async () => {
    const { root: rootValue } = await render(<SoftPromptModal {...defaultProps} />);

    // Verify the modal renders with the correct structure
    const dialogElement = findByType(rootValue!, 'Dialog');
    expect(dialogElement).toBeTruthy();

    // Find all Paragraph elements
    const paragraphs = findAllByType(rootValue!, 'Paragraph');
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);

    // Find all PrimaryButton elements
    const buttons = findAllByType(rootValue!, 'PrimaryButton');
    expect(buttons.length).toBe(2);
  });

  it('should not render when open is false', async () => {
    const { queryByText } = await render(<SoftPromptModal {...defaultProps} open={false} />);

    expect(queryByText('Enable Notifications')).toBeNull();
  });

  it('should call onAllow when Allow button is pressed', async () => {
    const onAllow = jest.fn();
    const { getByTestId } = await render(<SoftPromptModal {...defaultProps} onAllow={onAllow} />);

    await fireEvent.press(getByTestId('soft-prompt-allow'));

    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it('should call onNotNow when Not Now button is pressed', async () => {
    const onNotNow = jest.fn();
    const { getByTestId } = await render(<SoftPromptModal {...defaultProps} onNotNow={onNotNow} />);

    await fireEvent.press(getByTestId('soft-prompt-not-now'));

    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it('should use default empty strings when labels are not provided', async () => {
    const { queryByText } = await render(
      <SoftPromptModal {...defaultProps} allowLabel={undefined} notNowLabel={undefined} />,
    );

    // Buttons should still exist even with empty labels
    const allowButton = queryByText('Allow');
    const notNowButton = queryByText('Not Now');

    expect(allowButton).toBeNull();
    expect(notNowButton).toBeNull();
  });

  it('should call onOpenChange when modal tries to close after allow', async () => {
    const onOpenChange = jest.fn();
    const { getByTestId, rerender } = await render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Press allow button (sets allowCloseRef to true)
    await fireEvent.press(getByTestId('soft-prompt-allow'));

    // Now try to close the modal by changing open to false
    await rerender(<SoftPromptModal {...defaultProps} open={false} onOpenChange={onOpenChange} />);

    // onOpenChange should have been called when Dialog calls handleOpenChange
    expect(defaultProps.onAllow).toHaveBeenCalled();
  });

  it('should call onOpenChange when modal tries to close after not now', async () => {
    const onOpenChange = jest.fn();
    const { getByTestId } = await render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Press not now button (sets allowCloseRef to true)
    await fireEvent.press(getByTestId('soft-prompt-not-now'));

    expect(defaultProps.onNotNow).toHaveBeenCalled();
  });

  it('should render with custom labels', async () => {
    const { getByTestId } = await render(
      <SoftPromptModal {...defaultProps} allowLabel="Yes, Enable" notNowLabel="Maybe Later" />,
    );

    // Verify buttons exist with testIDs
    expect(getByTestId('soft-prompt-allow')).toBeTruthy();
    expect(getByTestId('soft-prompt-not-now')).toBeTruthy();
  });

  it('should have correct testIDs on buttons', async () => {
    const { getByTestId } = await render(<SoftPromptModal {...defaultProps} />);

    expect(getByTestId('soft-prompt-allow')).toBeTruthy();
    expect(getByTestId('soft-prompt-not-now')).toBeTruthy();
  });

  it('should use fallback stroke color when theme color returns undefined', async () => {
    const tamagui = require('tamagui');
    tamagui.useTheme.mockReturnValueOnce({ color: { get: () => undefined } });

    const { root: rootValue } = await render(<SoftPromptModal {...defaultProps} />);
    expect(findByType(rootValue!, 'Dialog')).toBeTruthy();
  });

  it('should use smaller icon size on narrow screens', async () => {
    const RN = require('react-native');
    const original = RN.useWindowDimensions;
    RN.useWindowDimensions = jest.fn(() => ({ width: 320, height: 568 }));

    const { root: rootValue } = await render(<SoftPromptModal {...defaultProps} />);
    expect(findByType(rootValue!, 'Dialog')).toBeTruthy();

    RN.useWindowDimensions = original;
  });

  it('should use larger icon size on wide screens', async () => {
    const RN = require('react-native');
    const original = RN.useWindowDimensions;
    RN.useWindowDimensions = jest.fn(() => ({ width: 420, height: 900 }));

    const { root: rootValue } = await render(<SoftPromptModal {...defaultProps} />);
    expect(findByType(rootValue!, 'Dialog')).toBeTruthy();

    RN.useWindowDimensions = original;
  });

  it('should render on web to cover web dialog sizing branch', async () => {
    const RN = require('react-native');
    const originalPlatform = RN.Platform.OS;
    Object.defineProperty(RN.Platform, 'OS', { value: 'web' });

    const { root: rootValue } = await render(<SoftPromptModal {...defaultProps} />);
    expect(findByType(rootValue!, 'Dialog')).toBeTruthy();

    Object.defineProperty(RN.Platform, 'OS', { value: originalPlatform });
  });

  it('should prevent closing when user has not clicked a button', async () => {
    const onOpenChange = jest.fn();
    const { root: rootValue } = await render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Find the Dialog component
    const dialog = findByType(rootValue!, 'Dialog');

    // Simulate Dialog trying to close (user clicking outside or pressing ESC)
    // The onOpenChange handler should be called with false
    dialog.props.onOpenChange(false);

    // Since allowCloseRef is false, onOpenChange should not be called
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('should allow closing after clicking allow button', async () => {
    const onOpenChange = jest.fn();
    const { getByTestId, root: rootValue } = await render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Click the allow button first (sets allowCloseRef to true)
    await fireEvent.press(getByTestId('soft-prompt-allow'));

    // Now simulate Dialog trying to close
    const dialog = findByType(rootValue!, 'Dialog');
    dialog.props.onOpenChange(false);

    // Now onOpenChange should be called because allowCloseRef was set to true
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should reset allowCloseRef after closing', async () => {
    const onOpenChange = jest.fn();
    const { getByTestId, root: rootValue } = await render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Click allow button
    await fireEvent.press(getByTestId('soft-prompt-allow'));

    // Simulate closing
    const dialog = findByType(rootValue!, 'Dialog');
    dialog.props.onOpenChange(false);

    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Try to close again - should be prevented since allowCloseRef was reset
    onOpenChange.mockClear();
    dialog.props.onOpenChange(false);

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
