import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

const mockOpenUrl = jest.fn();
const mockFriendlyError = jest.fn();
const mockToast = { show: jest.fn(), messages: [], dismiss: jest.fn() };

jest.spyOn(Linking, 'openURL').mockImplementation((...args: unknown[]) => mockOpenUrl(...args));

jest.mock('@/errors/useFriendlyErrorHandler', () => ({
  useFriendlyErrorHandler: () => mockFriendlyError,
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

  const SettingsSection = ({ title, children }: { title: string; children: any }) =>
    React.createElement(View, null, React.createElement(Text, null, title), children);
  SettingsSection.displayName = 'SettingsSection';

  const PrimaryButton = ({ children, onPress }: { children: any; onPress: () => void }) =>
    React.createElement(Pressable, { onPress }, React.createElement(Text, null, children));
  PrimaryButton.displayName = 'PrimaryButton';

  return {
    __esModule: true,
    ScreenContainer,
    SettingsSection,
    PrimaryButton,
    useToast: () => mockToast,
  };
});

jest.mock('tamagui', () => {
  const React = require('react');
  const { View, Text, TextInput } = require('react-native');

  const RadioGroup = ({ children, ...props }: any) =>
    React.createElement(View, { accessibilityLabel: props['aria-label'], ...props }, children);
  RadioGroup.displayName = 'RadioGroup';

  const RadioGroupItem = ({ children }: any) => React.createElement(View, null, children);
  RadioGroupItem.displayName = 'RadioGroup.Item';

  const RadioGroupIndicator = () => React.createElement(View, null);
  RadioGroupIndicator.displayName = 'RadioGroup.Indicator';

  (RadioGroup as any).Item = RadioGroupItem;
  (RadioGroup as any).Indicator = RadioGroupIndicator;

  const Input = ({ value, onChangeText, placeholder, multiline }: any) =>
    React.createElement(TextInput, {
      value,
      onChangeText,
      placeholder,
      multiline,
      testID: 'message-input',
    });
  Input.displayName = 'Input';

  const TextArea = ({ value, onChangeText, placeholder }: any) =>
    React.createElement(TextInput, {
      value,
      onChangeText,
      placeholder,
      testID: 'message-input',
    });
  TextArea.displayName = 'TextArea';

  const Label = ({ children }: any) => React.createElement(Text, null, children);
  Label.displayName = 'Label';

  const TextComponent = ({ children }: any) => React.createElement(Text, null, children);
  TextComponent.displayName = 'Text';

  const XStack = ({ children }: any) => React.createElement(View, null, children);
  XStack.displayName = 'XStack';

  const YStack = ({ children }: any) => React.createElement(View, null, children);
  YStack.displayName = 'YStack';

  return {
    __esModule: true,
    Input,
    TextArea,
    Label,
    RadioGroup,
    Text: TextComponent,
    XStack,
    YStack,
  };
});

jest.mock('@tamagui/lucide-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Mail = () => React.createElement(View, null);
  Mail.displayName = 'Mail';
  return { __esModule: true, Mail };
});

import GetHelpScreen from '../../../../app/(tabs)/settings/get-help';

describe('GetHelpScreen', () => {
  beforeEach(() => {
    mockOpenUrl.mockReset();
    mockFriendlyError.mockReset();
  });

  it('builds a feedback email by default', () => {
    const { getByText, getByTestId } = render(<GetHelpScreen />);

    fireEvent.changeText(getByTestId('message-input'), 'Hello there');
    fireEvent.press(getByText('settings.getHelpSendEmail'));

    expect(mockOpenUrl).toHaveBeenCalledWith(
      expect.stringContaining('mailto:support@luvenapps.com'),
    );
    expect(mockOpenUrl.mock.calls[0][0]).toContain('subject=settings.getHelpFeedbackSubject');
    expect(mockOpenUrl.mock.calls[0][0]).toContain('body=Hello%20there');
  });

  it('builds a bug report email when topic changes', () => {
    const { getByLabelText, getByText } = render(<GetHelpScreen />);

    fireEvent(getByLabelText('Support topic'), 'onValueChange', 'bug');
    fireEvent.press(getByText('settings.getHelpSendEmail'));

    expect(mockOpenUrl.mock.calls[0][0]).toContain('subject=settings.getHelpBugSubject');
  });

  it('reports errors when the mail client fails to open', async () => {
    const error = new Error('cannot open');
    mockOpenUrl.mockRejectedValueOnce(error);
    const { getByText } = render(<GetHelpScreen />);

    fireEvent.press(getByText('settings.getHelpSendEmail'));

    await waitFor(() => {
      expect(mockFriendlyError).toHaveBeenCalledWith(error, { surface: 'settings.get-help' });
    });
  });
});
