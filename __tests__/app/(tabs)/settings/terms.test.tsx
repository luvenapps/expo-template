import { fireEvent, render } from '@testing-library/react-native';
import { mockTranslate, mockTranslationLanguage } from '../../../helpers/i18nTranslationMock';

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
    t: mockTranslate,
    i18n: { language: mockTranslationLanguage.current },
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
    mockTranslationLanguage.current = 'en';
  });

  it('shows fallback terms content when no url is provided', async () => {
    mockUseFeatureFlag.mockReturnValue({ value: '' });
    const { getByText, queryByText } = await render(<TermsScreen />);

    expect(queryByText('Open Terms of Service')).toBeNull();
    expect(getByText('Last updated: January 28, 2026')).toBeDefined();
    expect(getByText('1. Eligibility')).toBeDefined();
  });

  it('shows translated terms content in Spanish when Spanish is selected', async () => {
    mockTranslationLanguage.current = 'es';
    mockUseFeatureFlag.mockReturnValue({ value: '' });
    const { getByText, queryByText } = await render(<TermsScreen />);

    expect(getByText('Términos del servicio')).toBeDefined();
    expect(getByText('Última actualización: 28 de enero de 2026')).toBeDefined();
    expect(getByText('1. Elegibilidad')).toBeDefined();
    expect(getByText(/Le damos la bienvenida a/)).toBeDefined();
    expect(queryByText('1. Eligibility')).toBeNull();
  });

  it('opens the browser when a terms url exists', async () => {
    const url = 'https://example.com/terms';
    mockUseFeatureFlag.mockReturnValue({ value: url });
    const { getByText } = await render(<TermsScreen />);

    const button = getByText('Open Terms of Service');
    await fireEvent.press(button);

    expect(mockOpenBrowserAsync).toHaveBeenCalledWith(url);
  });

  it('reports errors when opening the terms url fails', async () => {
    const url = 'https://example.com/terms';
    const error = new Error('open failed');
    mockUseFeatureFlag.mockReturnValue({ value: url });
    mockOpenBrowserAsync.mockRejectedValueOnce(error);
    const { getByText } = await render(<TermsScreen />);

    await fireEvent.press(getByText('Open Terms of Service'));

    expect(mockFriendlyError).toHaveBeenCalledWith(error, { surface: 'settings.terms' });
  });
});
