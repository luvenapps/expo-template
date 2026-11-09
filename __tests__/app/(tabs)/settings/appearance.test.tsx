import { fireEvent, render } from '@testing-library/react-native';
import { Platform } from 'react-native';

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
  useOptionalThemeContext: () => ({
    theme: 'system',
    setTheme: mockSetTheme,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/ui/icons', () => {
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
        gap: props.gap,
      },
      children,
    );
  Button.displayName = 'Button';

  const XStack = ({ children }: any) => React.createElement(View, null, children);
  XStack.displayName = 'XStack';

  return {
    Button,
    Text,
    XStack,
    YStack: ({ children }: any) => React.createElement(View, null, children),
  };
});

import AppearanceSettingsScreen from '../../../../app/(tabs)/settings/appearance';

const themeOptions = [
  ['system', 'settings.themeSystem'],
  ['light', 'settings.themeLight'],
  ['dark', 'settings.themeDark'],
] as const;

describe('AppearanceSettingsScreen', () => {
  beforeEach(() => {
    mockSetTheme.mockReset();
  });

  it.each(themeOptions)(
    'renders the %s theme label from its translation key',
    async (theme, labelKey) => {
      const { getByTestId } = await render(<AppearanceSettingsScreen />);

      expect(getByTestId(`theme-option-label-${theme}`).props.children).toBe(labelKey);
    },
  );

  it('matches Production theme option typography on web', async () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      value: 'web',
      writable: true,
      configurable: true,
    });

    try {
      const { getByTestId } = await render(<AppearanceSettingsScreen />);

      expect(getByTestId('theme-option-label-system').props.style).toMatchObject({
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: '300',
      });
      expect(getByTestId('theme-option-system').props.gap).toBe('10.555px');
    } finally {
      Object.defineProperty(Platform, 'OS', {
        value: originalPlatform,
        writable: true,
        configurable: true,
      });
    }
  });

  it('updates theme selection', async () => {
    const { getByTestId } = await render(<AppearanceSettingsScreen />);

    await fireEvent.press(getByTestId('theme-option-light'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
