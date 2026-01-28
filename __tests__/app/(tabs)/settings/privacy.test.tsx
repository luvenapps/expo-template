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

import PrivacyScreen from '../../../../app/(tabs)/settings/privacy';

describe('PrivacyScreen', () => {
  beforeEach(() => {
    mockOpenBrowserAsync.mockReset();
    mockUseFeatureFlag.mockReset();
    mockFriendlyError.mockReset();
  });

  it('shows fallback privacy content when no url is provided', () => {
    mockUseFeatureFlag.mockReturnValue({ value: '' });
    const { queryByText } = render(<PrivacyScreen />);

    expect(queryByText('settings.openPrivacy')).toBeNull();
  });

  it('opens the browser when a privacy url exists', () => {
    const url = 'https://example.com/privacy';
    mockUseFeatureFlag.mockReturnValue({ value: url });
    const { getByText } = render(<PrivacyScreen />);

    const button = getByText('settings.openPrivacy');
    fireEvent.press(button);

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(url);
  });

  it('reports errors when opening the privacy url fails', async () => {
    const url = 'https://example.com/privacy';
    const error = new Error('open failed');
    mockUseFeatureFlag.mockReturnValue({ value: url });
    mockOpenBrowserAsync.mockRejectedValueOnce(error);
    const { getByText } = render(<PrivacyScreen />);

    await fireEvent.press(getByText('settings.openPrivacy'));

    expect(mockFriendlyError).toHaveBeenCalledWith(error, { surface: 'settings.privacy' });
  });
});
