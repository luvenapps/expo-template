// Mock Tamagui components
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  const Dialog: any = ({ children, open, onOpenChange }: any) => {
    if (!open) return null;
    return React.createElement(View, { testID: 'dialog', onOpenChange }, children);
  };
  Dialog.displayName = 'Dialog';

  Dialog.Portal = ({ children }: any) =>
    React.createElement(View, { testID: 'dialog-portal' }, children);
  Dialog.Portal.displayName = 'Dialog.Portal';

  Dialog.Overlay = () => React.createElement(View, { testID: 'dialog-overlay' });
  Dialog.Overlay.displayName = 'Dialog.Overlay';

  Dialog.Content = ({ children, ...props }: any) =>
    React.createElement(View, { testID: 'dialog-content', ...props }, children);
  Dialog.Content.displayName = 'Dialog.Content';

  Dialog.Title = ({ children, asChild }: any) => {
    if (asChild) return children;
    return React.createElement(Text, { testID: 'dialog-title' }, children);
  };
  Dialog.Title.displayName = 'Dialog.Title';

  Dialog.Description = ({ children, asChild }: any) => {
    if (asChild) return children;
    return React.createElement(Text, { testID: 'dialog-description' }, children);
  };
  Dialog.Description.displayName = 'Dialog.Description';

  const Paragraph = ({ children, ...props }: any) => React.createElement(Text, props, children);
  Paragraph.displayName = 'Paragraph';

  const YStack = ({ children, ...props }: any) => React.createElement(View, props, children);
  YStack.displayName = 'YStack';

  const XStack = ({ children, ...props }: any) => React.createElement(View, props, children);
  XStack.displayName = 'XStack';

  const useTheme = () => ({
    color: {
      get: () => '#111',
    },
  });

  return {
    Dialog,
    Paragraph,
    YStack,
    XStack,
    useTheme,
  };
});

// Mock FormField
jest.mock('@/ui/components/FormField', () => {
  const React = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');

  const FormFieldComponent = React.forwardRef(
    ({ onChangeText, value, inputTestID, testID, ...props }: any, ref: any) =>
      React.createElement(TextInput, {
        ref,
        testID: inputTestID || testID,
        onChangeText,
        value,
        ...props,
      }),
  );
  FormFieldComponent.displayName = 'FormField';

  return {
    FormField: FormFieldComponent,
  };
});

// Mock PrimaryButton
jest.mock('@/ui/components/PrimaryButton', () => {
  const React = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    PrimaryButton: ({ children, onPress, disabled, testID }: any) =>
      React.createElement(
        View,
        {
          testID,
          accessibilityState: { disabled },
          // Simulate touchable behavior
          onPress,
        },
        React.createElement(Text, null, children),
      ),
  };
});

import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { NamePromptModal } from '@/ui/components/NamePromptModal';

describe('NamePromptModal', () => {
  const defaultProps = {
    open: true,
    title: 'What is your name?',
    message: 'Please enter your full name',
    label: 'Name',
    placeholder: 'Enter your name',
    value: '',
    actionLabel: 'Save',
    onChangeText: jest.fn(),
    onSave: jest.fn(),
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when open is true', () => {
      const { getByTestId } = render(<NamePromptModal {...defaultProps} />);

      expect(getByTestId('dialog')).toBeTruthy();
      expect(getByTestId('name-prompt-input')).toBeTruthy();
      expect(getByTestId('name-prompt-save')).toBeTruthy();
    });

    it('does not render when open is false', () => {
      const { queryByTestId } = render(<NamePromptModal {...defaultProps} open={false} />);

      expect(queryByTestId('dialog')).toBeNull();
    });

    it('displays title and message', () => {
      const { getByText } = render(<NamePromptModal {...defaultProps} />);

      expect(getByText('What is your name?')).toBeTruthy();
      expect(getByText('Please enter your full name')).toBeTruthy();
    });

    it('displays action label on button', () => {
      const { getByText } = render(<NamePromptModal {...defaultProps} />);

      expect(getByText('Save')).toBeTruthy();
    });

    it('displays the current value in input', () => {
      const { getByTestId } = render(<NamePromptModal {...defaultProps} value="John Doe" />);

      const input = getByTestId('name-prompt-input');
      expect(input.props.value).toBe('John Doe');
    });
  });

  describe('Input handling', () => {
    it('calls onChangeText when input changes', () => {
      const onChangeText = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} onChangeText={onChangeText} />,
      );

      const input = getByTestId('name-prompt-input');
      fireEvent.changeText(input, 'Ada Lovelace');

      expect(onChangeText).toHaveBeenCalledWith('Ada Lovelace');
    });
  });

  describe('Save button state', () => {
    it('disables save button when value is empty', () => {
      const { getByTestId } = render(<NamePromptModal {...defaultProps} value="" />);

      const button = getByTestId('name-prompt-save');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('disables save button when value is only whitespace', () => {
      const { getByTestId } = render(<NamePromptModal {...defaultProps} value="   " />);

      const button = getByTestId('name-prompt-save');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('enables save button when value has content', () => {
      const { getByTestId } = render(<NamePromptModal {...defaultProps} value="Grace Hopper" />);

      const button = getByTestId('name-prompt-save');
      expect(button.props.accessibilityState.disabled).toBe(false);
    });

    it('enables save button when value has content after trimming', () => {
      const { getByTestId } = render(<NamePromptModal {...defaultProps} value="  Alan Turing  " />);

      const button = getByTestId('name-prompt-save');
      expect(button.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('Save functionality', () => {
    it('calls onSave with trimmed value when button is pressed', () => {
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value="  Margaret Hamilton  " onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      expect(onSave).toHaveBeenCalledWith('Margaret Hamilton');
    });

    it('does not call onSave when value is empty', () => {
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value="" onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      expect(onSave).not.toHaveBeenCalled();
    });

    it('does not call onSave when value is only whitespace', () => {
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value="   " onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      expect(onSave).not.toHaveBeenCalled();
    });

    it('handleSave returns early when canSave is false', () => {
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value="" onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      // Even though button is disabled, we can still fire press event to trigger handleSave
      fireEvent.press(button);

      // onSave should not be called because canSave is false
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('Dialog close behavior', () => {
    it('calls onOpenChange when dialog is closed after save', () => {
      const onOpenChange = jest.fn();
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal
          {...defaultProps}
          value="Katherine Johnson"
          onOpenChange={onOpenChange}
          onSave={onSave}
        />,
      );

      // Press save button - this sets allowCloseRef to true
      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      // Simulate dialog trying to close by calling onOpenChange from Dialog
      // In real usage, Dialog component would call this
      const dialog = getByTestId('dialog');
      if (dialog.props.onOpenChange) {
        dialog.props.onOpenChange(false);
      }

      // Should allow close after save
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('prevents closing dialog when save has not been triggered', () => {
      const onOpenChange = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value="Test" onOpenChange={onOpenChange} />,
      );

      // Try to close dialog without saving
      const dialog = getByTestId('dialog');
      if (dialog.props.onOpenChange) {
        dialog.props.onOpenChange(false);
      }

      // Should not call onOpenChange because allowCloseRef is false
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('does not error when onOpenChange is not provided', () => {
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} onOpenChange={undefined} value="Test" />,
      );

      // Should not throw when onOpenChange is undefined
      expect(() => {
        const button = getByTestId('name-prompt-save');
        fireEvent.press(button);
      }).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('renders with empty string props', () => {
      const { getByTestId } = render(
        <NamePromptModal
          {...defaultProps}
          title=""
          message=""
          label=""
          placeholder=""
          actionLabel=""
        />,
      );

      // Should render without errors even with empty strings
      expect(getByTestId('dialog')).toBeTruthy();
    });

    it('handles very long names', () => {
      const longName = 'A'.repeat(1000);
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value={longName} onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      expect(onSave).toHaveBeenCalledWith(longName);
    });

    it('handles special characters in name', () => {
      const specialName = "O'Brien-Smith";
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value={specialName} onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      expect(onSave).toHaveBeenCalledWith(specialName);
    });

    it('handles unicode characters', () => {
      const unicodeName = '田中 太郎';
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value={unicodeName} onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      expect(onSave).toHaveBeenCalledWith(unicodeName);
    });

    it('calls onSave when value has exactly one character after trimming', () => {
      const onSave = jest.fn();
      const { getByTestId } = render(
        <NamePromptModal {...defaultProps} value=" X " onSave={onSave} />,
      );

      const button = getByTestId('name-prompt-save');
      fireEvent.press(button);

      expect(onSave).toHaveBeenCalledWith('X');
    });
  });
});
