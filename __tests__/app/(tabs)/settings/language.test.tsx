import { fireEvent, render } from '@testing-library/react-native';

const mockSetLanguage = jest.fn();

jest.mock('@/i18n', () => ({
  setLanguage: (...args: unknown[]) => mockSetLanguage(...args),
  supportedLanguages: [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
  ],
}));

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

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('tamagui', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  const Button = ({ children, onPress, disabled, testID }: any) =>
    React.createElement(
      Pressable,
      { onPress: disabled ? undefined : onPress, testID },
      React.createElement(Text, null, children),
    );
  Button.displayName = 'Button';

  const YStack = ({ children }: any) => React.createElement(View, null, children);
  YStack.displayName = 'YStack';

  return {
    Button,
    YStack,
  };
});

import LanguageSettingsScreen from '../../../../app/(tabs)/settings/language';

describe('LanguageSettingsScreen', () => {
  beforeEach(() => {
    mockSetLanguage.mockReset();
  });

  it('calls setLanguage when a language option is selected', () => {
    const { getByText } = render(<LanguageSettingsScreen />);

    fireEvent.press(getByText('Spanish'));

    expect(mockSetLanguage).toHaveBeenCalledWith('es');
  });
});
