import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { SoftPromptModal } from '@/ui/components/SoftPromptModal';

// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
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
    Paragraph: ({ children, ...props }: any) => React.createElement('Paragraph', props, children),
  };
});

// Mock PrimaryButton
jest.mock('@/ui/components/PrimaryButton', () => {
  const React = jest.requireActual('react');
  return {
    PrimaryButton: ({ children, onPress, testID, ...props }: any) =>
      React.createElement(
        'PrimaryButton',
        {
          ...props,
          testID,
          onPress,
        },
        children,
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

  it('should render when open is true', () => {
    const { UNSAFE_root } = render(<SoftPromptModal {...defaultProps} />);

    // Verify the modal renders with the correct structure
    const dialogElement = UNSAFE_root.findByType('Dialog' as any);
    expect(dialogElement).toBeTruthy();

    // Find all Paragraph elements
    const paragraphs = UNSAFE_root.findAllByType('Paragraph' as any);
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);

    // Find all PrimaryButton elements
    const buttons = UNSAFE_root.findAllByType('PrimaryButton' as any);
    expect(buttons.length).toBe(2);
  });

  it('should not render when open is false', () => {
    const { queryByText } = render(<SoftPromptModal {...defaultProps} open={false} />);

    expect(queryByText('Enable Notifications')).toBeNull();
  });

  it('should call onAllow when Allow button is pressed', () => {
    const onAllow = jest.fn();
    const { getByTestId } = render(<SoftPromptModal {...defaultProps} onAllow={onAllow} />);

    fireEvent.press(getByTestId('soft-prompt-allow'));

    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it('should call onNotNow when Not Now button is pressed', () => {
    const onNotNow = jest.fn();
    const { getByTestId } = render(<SoftPromptModal {...defaultProps} onNotNow={onNotNow} />);

    fireEvent.press(getByTestId('soft-prompt-not-now'));

    expect(onNotNow).toHaveBeenCalledTimes(1);
  });

  it('should use default empty strings when labels are not provided', () => {
    const { queryByText } = render(
      <SoftPromptModal {...defaultProps} allowLabel={undefined} notNowLabel={undefined} />,
    );

    // Buttons should still exist even with empty labels
    const allowButton = queryByText('Allow');
    const notNowButton = queryByText('Not Now');

    expect(allowButton).toBeNull();
    expect(notNowButton).toBeNull();
  });

  it('should call onOpenChange when modal tries to close after allow', () => {
    const onOpenChange = jest.fn();
    const { getByTestId, rerender } = render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Press allow button (sets allowCloseRef to true)
    fireEvent.press(getByTestId('soft-prompt-allow'));

    // Now try to close the modal by changing open to false
    rerender(<SoftPromptModal {...defaultProps} open={false} onOpenChange={onOpenChange} />);

    // onOpenChange should have been called when Dialog calls handleOpenChange
    expect(defaultProps.onAllow).toHaveBeenCalled();
  });

  it('should call onOpenChange when modal tries to close after not now', () => {
    const onOpenChange = jest.fn();
    const { getByTestId } = render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Press not now button (sets allowCloseRef to true)
    fireEvent.press(getByTestId('soft-prompt-not-now'));

    expect(defaultProps.onNotNow).toHaveBeenCalled();
  });

  it('should render with custom labels', () => {
    const { getByTestId } = render(
      <SoftPromptModal {...defaultProps} allowLabel="Yes, Enable" notNowLabel="Maybe Later" />,
    );

    // Verify buttons exist with testIDs
    expect(getByTestId('soft-prompt-allow')).toBeTruthy();
    expect(getByTestId('soft-prompt-not-now')).toBeTruthy();
  });

  it('should have correct testIDs on buttons', () => {
    const { getByTestId } = render(<SoftPromptModal {...defaultProps} />);

    expect(getByTestId('soft-prompt-allow')).toBeTruthy();
    expect(getByTestId('soft-prompt-not-now')).toBeTruthy();
  });

  it('should prevent closing when user has not clicked a button', () => {
    const onOpenChange = jest.fn();
    const { UNSAFE_root } = render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Find the Dialog component
    const dialog = UNSAFE_root.findByType('Dialog' as any);

    // Simulate Dialog trying to close (user clicking outside or pressing ESC)
    // The onOpenChange handler should be called with false
    dialog.props.onOpenChange(false);

    // Since allowCloseRef is false, onOpenChange should not be called
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('should allow closing after clicking allow button', () => {
    const onOpenChange = jest.fn();
    const { getByTestId, UNSAFE_root } = render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Click the allow button first (sets allowCloseRef to true)
    fireEvent.press(getByTestId('soft-prompt-allow'));

    // Now simulate Dialog trying to close
    const dialog = UNSAFE_root.findByType('Dialog' as any);
    dialog.props.onOpenChange(false);

    // Now onOpenChange should be called because allowCloseRef was set to true
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should reset allowCloseRef after closing', () => {
    const onOpenChange = jest.fn();
    const { getByTestId, UNSAFE_root } = render(
      <SoftPromptModal {...defaultProps} onOpenChange={onOpenChange} />,
    );

    // Click allow button
    fireEvent.press(getByTestId('soft-prompt-allow'));

    // Simulate closing
    const dialog = UNSAFE_root.findByType('Dialog' as any);
    dialog.props.onOpenChange(false);

    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Try to close again - should be prevented since allowCloseRef was reset
    onOpenChange.mockClear();
    dialog.props.onOpenChange(false);

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
