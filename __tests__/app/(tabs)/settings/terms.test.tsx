import { fireEvent, render } from '@testing-library/react-native';

const mockOpenBrowserAsync = jest.fn();
const mockUseFeatureFlag = jest.fn();
const mockFriendlyError = jest.fn();

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowserAsync(...args),
}));

jest.mock('@/featureFlags/useFeatureFlag', () => ({
  useFeatureFlag: (...args: unknown[]) => mockUseFeatureFlag(...args),
}));

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

  return {
    ScreenContainer: ({ children }: { children: any }) => React.createElement(View, null, children),
    SettingsSection: ({ title, children }: { title: string; children: any }) =>
      React.createElement(View, null, React.createElement(Text, null, title), children),
    PrimaryButton: ({ children, onPress }: { children: any; onPress: () => void }) =>
      React.createElement(Pressable, { onPress }, React.createElement(Text, null, children)),
    useToast: () => ({ show: jest.fn(), messages: [], dismiss: jest.fn() }),
  };
});

import TermsScreen from '../../../../app/(tabs)/settings/terms';

describe('TermsScreen', () => {
  beforeEach(() => {
    mockOpenBrowserAsync.mockReset();
    mockUseFeatureFlag.mockReset();
    mockFriendlyError.mockReset();
  });

  it('shows fallback terms content when no url is provided', () => {
    mockUseFeatureFlag.mockReturnValue({ value: '' });
    const { queryByText } = render(<TermsScreen />);

    expect(queryByText('settings.openTerms')).toBeNull();
  });

  it('opens the browser when a terms url exists', () => {
    const url = 'https://example.com/terms';
    mockUseFeatureFlag.mockReturnValue({ value: url });
    const { getByText } = render(<TermsScreen />);

    const button = getByText('settings.openTerms');
    fireEvent.press(button);

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(url);
  });

  it('reports errors when opening the terms url fails', async () => {
    const url = 'https://example.com/terms';
    const error = new Error('open failed');
    mockUseFeatureFlag.mockReturnValue({ value: url });
    mockOpenBrowserAsync.mockRejectedValueOnce(error);
    const { getByText } = render(<TermsScreen />);

    await fireEvent.press(getByText('settings.openTerms'));

    expect(mockFriendlyError).toHaveBeenCalledWith(error, { surface: 'settings.terms' });
  });
});
