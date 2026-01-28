import { fireEvent, render } from '@testing-library/react-native';

const mockSetTheme = jest.fn();

jest.mock('@/ui', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const ScreenContainer = ({ children }: { children: any }) =>
    React.createElement(View, null, children);
  ScreenContainer.displayName = 'ScreenContainer';

  const SettingsSection = ({ title, children }: any) =>
    React.createElement(View, null, React.createElement(Text, null, title), children);
  SettingsSection.displayName = 'SettingsSection';

  return {
    ScreenContainer,
    SettingsSection,
  };
});

jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: () => ({
    theme: 'system',
    setTheme: mockSetTheme,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@tamagui/lucide-icons', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Icon = () => React.createElement(View, null);
  Icon.displayName = 'Icon';

  return {
    Monitor: Icon,
    Moon: Icon,
    Sun: Icon,
  };
});

jest.mock('tamagui', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  const Button = ({ children, onPress, disabled, testID, ...props }: any) =>
    React.createElement(
      Pressable,
      {
        onPress: disabled ? undefined : onPress,
        testID,
        accessibilityLabel: props['aria-label'],
      },
      React.createElement(Text, null, children),
    );
  Button.displayName = 'Button';

  const XStack = ({ children }: any) => React.createElement(View, null, children);
  XStack.displayName = 'XStack';

  return {
    Button,
    XStack,
  };
});

import AppearanceSettingsScreen from '../../../../app/(tabs)/settings/appearance';

describe('AppearanceSettingsScreen', () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
  });

  it('renders theme options and updates theme selection', () => {
    const { getByLabelText } = render(<AppearanceSettingsScreen />);

    fireEvent.press(getByLabelText('settings.themeLight'));

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
