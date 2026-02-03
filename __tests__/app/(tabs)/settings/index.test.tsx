// Mock expo-router
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const mockReact = jest.requireActual('react');

  const Stack = {
    Screen: ({ options }: any) => {
      return mockReact.createElement('StackScreen', {
        testID: 'stack-screen',
        options,
      });
    },
  };

  return {
    Stack,
    useRouter: () => ({
      push: mockPush,
    }),
    useFocusEffect: (effect: () => void | (() => void)) => effect(),
  };
});

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => {
  const { themePalettes } = jest.requireActual('@/ui/theme/palette');
  return {
    useThemeContext: jest.fn(() => ({
      theme: 'system',
      setTheme: jest.fn(),
      resolvedTheme: 'dark',
      palette: {
        background: themePalettes.dark.background,
        text: themePalettes.dark.text,
        mutedText: themePalettes.dark.mutedText,
        accent: themePalettes.dark.accent,
        accentMuted: themePalettes.dark.accentMuted,
        surface: themePalettes.dark.surface,
        secondaryBackground: themePalettes.dark.secondaryBackground,
        secondaryText: themePalettes.dark.secondaryText,
      },
    })),
    useOptionalThemeContext: jest.fn(() => ({
      theme: 'system',
      setTheme: jest.fn(),
      resolvedTheme: 'dark',
      palette: {
        background: themePalettes.dark.background,
        text: themePalettes.dark.text,
        mutedText: themePalettes.dark.mutedText,
        accent: themePalettes.dark.accent,
        accentMuted: themePalettes.dark.accentMuted,
        surface: themePalettes.dark.surface,
        secondaryBackground: themePalettes.dark.secondaryBackground,
        secondaryText: themePalettes.dark.secondaryText,
      },
    })),
  };
});

jest.mock('@/notifications/useNotificationSettings', () => ({
  useNotificationSettings: jest.fn(() => ({
    permissionStatus: 'prompt',
    error: null,
    pushError: null,
    notificationStatus: 'unknown',
    osLastPromptAt: 0,
    pushManuallyDisabled: false,
    softDeclineCount: 0,
    softLastDeclinedAt: 0,
    tryPromptForPush: jest.fn(),
    disablePushNotifications: jest.fn(),
    isSupported: true,
    isChecking: false,
    refreshPermissionStatus: jest.fn(),
  })),
}));

// Mock auth session
jest.mock('@/auth/session', () => ({
  useSessionStore: jest.fn(),
}));

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

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })),
  SafeAreaProvider: ({ children }: any) => children,
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const mockReact = jest.requireActual('react');

  return {
    GestureHandlerRootView: ({ children, style }: any) =>
      mockReact.createElement('GestureHandlerRootView', { style }, children),
  };
});

// Mock Tamagui
jest.mock('tamagui', () => {
  const mockReact = jest.requireActual('react');

  const CardComponent = ({ children, ...props }: any) =>
    mockReact.createElement('View', props, children);

  return {
    View: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    YStack: ({ children, testID, ...props }: any) =>
      mockReact.createElement('View', { testID, ...props }, children),
    XStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    Card: CardComponent,
    Text: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    Button: ({ children, onPress, disabled, testID, ...props }: any) =>
      mockReact.createElement(
        'TouchableOpacity',
        { onPress, disabled, testID, ...props },
        mockReact.createElement('Text', {}, children),
      ),
    Separator: ({ ...props }: any) => mockReact.createElement('View', props),
  };
});

jest.mock('react-i18next', () => {
  const translations: Record<string, Record<string, string>> = {
    en: {
      'settings.themeTitle': 'Theme',
      'settings.themeSystem': 'System',
      'settings.themeLight': 'Light',
      'settings.themeDark': 'Dark',
      'settings.languageTitle': 'Language',
      'settings.notificationsTitle': 'Notifications',
      'settings.summarySetupNeeded': 'Setup Needed',
      'settings.summaryOn': 'On',
      'settings.summaryOff': 'Off',
      'settings.accountTitle': 'Account',
      'settings.accountSignedIn': 'Signed in',
      'settings.signIn': 'Sign In',
      'settings.developerUtilitiesTitle': 'Developer Utilities',
      'settings.getHelpTitle': 'Get Help',
      'settings.termsTitle': 'Terms of Service',
      'settings.privacyTitle': 'Privacy Policy',
    },
    es: {
      'settings.themeTitle': 'Tema',
      'settings.themeSystem': 'Sistema',
      'settings.themeLight': 'Claro',
      'settings.themeDark': 'Oscuro',
      'settings.languageTitle': 'Idioma',
      'settings.notificationsTitle': 'Notificaciones',
      'settings.summarySetupNeeded': 'Configuración necesaria',
      'settings.summaryOn': 'Activado',
      'settings.summaryOff': 'Desactivado',
      'settings.accountTitle': 'Cuenta',
      'settings.accountSignedIn': 'Sesión iniciada',
      'settings.signIn': 'Iniciar sesión',
      'settings.developerUtilitiesTitle': 'Utilidades de desarrollador',
      'settings.getHelpTitle': 'Obtener ayuda',
      'settings.termsTitle': 'Términos de servicio',
      'settings.privacyTitle': 'Política de privacidad',
    },
  };

  return {
    useTranslation: () => {
      const lang = (globalThis as any).__TEST_LANG ?? 'en';
      return {
        t: (key: string, opts?: Record<string, any>) => {
          const raw = translations[lang]?.[key];
          if (!raw) return key;
          if (opts) {
            return Object.keys(opts).reduce(
              (acc, k) => acc.replace(`{{${k}}}`, String(opts[k])),
              raw,
            );
          }
          return raw;
        },
        i18n: {
          language: lang,
          resolvedLanguage: lang,
          languages: [lang],
        },
      };
    },
  };
});

jest.mock('@/i18n', () => ({
  setLanguage: (code: string) => {
    (globalThis as any).__TEST_LANG = code;
  },
  supportedLanguages: [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
  ],
}));

// Mock Tamagui Lucide Icons
jest.mock('@tamagui/lucide-icons', () => ({
  Bell: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'bell-icon', size, color });
  },
  ChevronRight: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'chevron-right-icon', size, color });
  },
  FileText: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'file-text-icon', size, color });
  },
  HelpCircle: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'help-circle-icon', size, color });
  },
  Languages: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'languages-icon', size, color });
  },
  Palette: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'palette-icon', size, color });
  },
  Shield: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'shield-icon', size, color });
  },
  User: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'user-icon', size, color });
  },
  Wrench: ({ size, color }: any) => {
    const mockReact = jest.requireActual('react');
    return mockReact.createElement('View', { testID: 'wrench-icon', size, color });
  },
}));

// Mock UI components
jest.mock('@/ui', () => {
  const mockReact = jest.requireActual('react');

  return {
    ScreenContainer: ({ children, ...props }: any) =>
      mockReact.createElement('View', props, children),
    useToast: () => ({ show: jest.fn(), messages: [], dismiss: jest.fn() }),
  };
});

const NOTIFICATION_PERMISSION_STATE = {
  PROMPT: 'prompt',
  GRANTED: 'granted',
  DENIED: 'denied',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
} as const;

const NOTIFICATION_STATUS = {
  UNKNOWN: 'unknown',
  GRANTED: 'granted',
  DENIED: 'denied',
} as const;

jest.mock('@/notifications/status', () => ({
  NOTIFICATION_PERMISSION_STATE: {
    PROMPT: 'prompt',
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
  },
  NOTIFICATION_STATUS: {
    UNKNOWN: 'unknown',
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

import { useSessionStore } from '@/auth/session';
import { useNotificationSettings } from '@/notifications/useNotificationSettings';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { themePalettes } from '@/ui/theme/palette';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Platform, Text } from 'react-native';
import SettingsScreen, { SettingsRow } from '../../../../app/(tabs)/settings/index';

const mockedUseSessionStore = useSessionStore as unknown as jest.Mock;
const mockedUseThemeContext = useThemeContext as unknown as jest.Mock;
const mockedUseNotificationSettings = useNotificationSettings as unknown as jest.Mock;

type NotificationSettingsMock = ReturnType<typeof useNotificationSettings>;

const buildNotificationSettings = (
  overrides: Partial<NotificationSettingsMock> = {},
): NotificationSettingsMock => ({
  permissionStatus: 'prompt',
  error: null,
  pushError: null,
  isSupported: true,
  isChecking: false,
  notificationStatus: 'unknown',
  pushManuallyDisabled: false,
  softDeclineCount: 0,
  softLastDeclinedAt: 0,
  tryPromptForPush: jest.fn(() =>
    Promise.resolve({ status: 'triggered' as const, registered: true }),
  ),
  disablePushNotifications: jest.fn(() => Promise.resolve()),
  refreshPermissionStatus: jest.fn(() => Promise.resolve('prompt' as const)),
  refreshPreferences: jest.fn(),
  softPrompt: {
    open: false,
    title: 'Enable notifications?',
    message: 'Get reminders',
    allowLabel: 'Allow',
    notNowLabel: 'Not now',
    onAllow: jest.fn(() => Promise.resolve()),
    onNotNow: jest.fn(),
    setOpen: jest.fn(),
  },
  ...overrides,
});

describe('SettingsScreen', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    (globalThis as any).__TEST_LANG = 'en';
    mockOpenBrowserAsync.mockReset();
    mockUseFeatureFlag.mockReset();
    mockFriendlyError.mockReset();
    mockUseFeatureFlag.mockReturnValue({ value: '' });
    mockedUseThemeContext.mockReturnValue({
      theme: 'system',
      setTheme: jest.fn(),
      resolvedTheme: 'dark',
      palette: themePalettes.dark,
    });
    mockedUseNotificationSettings.mockReturnValue(buildNotificationSettings());
    mockedUseSessionStore.mockImplementation((selector: any) =>
      selector({
        status: 'unauthenticated',
        session: null,
        signOut: jest.fn(),
        isLoading: false,
      }),
    );
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  describe('General Rendering', () => {
    it('should render without crashing', () => {
      const { UNSAFE_root } = render(<SettingsScreen />);
      expect(UNSAFE_root).toBeDefined();
    });

    it('should render all settings rows', () => {
      const { getByText } = render(<SettingsScreen />);

      expect(getByText('Theme')).toBeDefined();
      expect(getByText('Language')).toBeDefined();
      expect(getByText('Notifications')).toBeDefined();
      expect(getByText('Account')).toBeDefined();
      expect(getByText('Developer Utilities')).toBeDefined();
      expect(getByText('Get Help')).toBeDefined();
      expect(getByText('Terms of Service')).toBeDefined();
      expect(getByText('Privacy Policy')).toBeDefined();
    });
  });

  describe('Theme Row', () => {
    it('should display current theme preference', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('System')).toBeDefined();
    });

    it('should display light theme when selected', () => {
      mockedUseThemeContext.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
        resolvedTheme: 'light',
        palette: themePalettes.light,
      });

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Light')).toBeDefined();
    });

    it('should display dark theme when selected', () => {
      mockedUseThemeContext.mockReturnValue({
        theme: 'dark',
        setTheme: jest.fn(),
        resolvedTheme: 'dark',
        palette: themePalettes.dark,
      });

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Dark')).toBeDefined();
    });

    it('should navigate to appearance screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Theme'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/appearance');
    });
  });

  describe('Language Row', () => {
    it('should display current language', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('English')).toBeDefined();
    });

    it('should display Spanish when selected', () => {
      (globalThis as any).__TEST_LANG = 'es';
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Español')).toBeDefined();
    });

    it('falls back to the raw language code when unsupported', () => {
      (globalThis as any).__TEST_LANG = 'fr';
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('fr')).toBeDefined();
    });

    it('handles region-tagged locales', () => {
      (globalThis as any).__TEST_LANG = 'en-US';
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('English')).toBeDefined();
    });

    it('should navigate to language screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Language'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/language');
    });
  });

  describe('SettingsRow', () => {
    it('uses the default icon background when none is provided', () => {
      const { UNSAFE_root } = render(
        <SettingsRow title="Row" onPress={jest.fn()} icon={<Text testID="row-icon" />} />,
      );

      const iconWrapper = UNSAFE_root.findAllByType('View').find(
        (node: { props: { width?: number; height?: number } }) => {
          return node.props.width === 32 && node.props.height === 32;
        },
      );

      expect(iconWrapper?.props.backgroundColor).toBe('$backgroundHover');
    });
  });

  describe('Notifications Row', () => {
    it('should display "Setup Needed" when notifications are blocked', () => {
      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.BLOCKED,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Setup Needed')).toBeDefined();
    });

    it('should display "On" when notifications are enabled', () => {
      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.GRANTED,
          notificationStatus: NOTIFICATION_STATUS.GRANTED,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('On')).toBeDefined();
    });

    it('should display "Off" when notifications permission is prompt (not granted)', () => {
      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.PROMPT,
          notificationStatus: NOTIFICATION_STATUS.UNKNOWN,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Off')).toBeDefined();
    });

    it('should navigate to notifications screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Notifications'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/notifications');
    });

    it('uses web-only blocked state logic when on web', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        writable: true,
        configurable: true,
      });
      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.DENIED,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Off')).toBeDefined();
    });
  });

  describe('Account Row - Unauthenticated', () => {
    beforeEach(() => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'unauthenticated',
          session: null,
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
    });

    it('should display "Sign In" when unauthenticated', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Sign In')).toBeDefined();
    });

    it('should navigate to account screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Account'));
      expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  describe('Account Row - Authenticated', () => {
    beforeEach(() => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              email: 'test@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );
    });

    it('should display user email when authenticated', () => {
      const { getByText } = render(<SettingsScreen />);
      expect(getByText('test@example.com')).toBeDefined();
    });

    it('should display "Signed in" when authenticated without email', () => {
      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {},
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Signed in')).toBeDefined();
    });

    it('should navigate to account screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Account'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/account');
    });
  });

  describe('Developer Utilities Row', () => {
    it('should navigate to developer utilities screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Developer Utilities'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/developer-utilities');
    });
  });

  describe('Get Help Row', () => {
    it('should navigate to get help screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Get Help'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/get-help');
    });
  });

  describe('Terms Row', () => {
    it('should navigate to terms screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Terms of Service'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/terms');
    });

    it('opens the in-app browser when terms url is configured', () => {
      mockUseFeatureFlag
        .mockReturnValueOnce({ value: 'https://example.com/terms' })
        .mockReturnValueOnce({ value: '' });
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Terms of Service'));
      expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://example.com/terms');
      expect(mockPush).not.toHaveBeenCalledWith('/(tabs)/settings/terms');
    });

    it('reports errors when opening terms url fails', async () => {
      const error = new Error('open failed');
      mockUseFeatureFlag
        .mockReturnValueOnce({ value: 'https://example.com/terms' })
        .mockReturnValueOnce({ value: '' });
      mockOpenBrowserAsync.mockRejectedValueOnce(error);
      const { getByText } = render(<SettingsScreen />);

      await fireEvent.press(getByText('Terms of Service'));

      expect(mockFriendlyError).toHaveBeenCalledWith(error, { surface: 'settings.legal-links' });
    });
  });

  describe('Privacy Row', () => {
    it('should navigate to privacy screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Privacy Policy'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/privacy');
    });

    it('opens the in-app browser when privacy url is configured', () => {
      mockUseFeatureFlag
        .mockReturnValueOnce({ value: '' })
        .mockReturnValueOnce({ value: 'https://example.com/privacy' });
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Privacy Policy'));
      expect(mockOpenBrowserAsync).toHaveBeenCalledWith('https://example.com/privacy');
      expect(mockPush).not.toHaveBeenCalledWith('/(tabs)/settings/privacy');
    });

    it('reports errors when opening privacy url fails', async () => {
      const error = new Error('open failed');
      mockUseFeatureFlag
        .mockReturnValueOnce({ value: '' })
        .mockReturnValueOnce({ value: 'https://example.com/privacy' });
      mockOpenBrowserAsync.mockRejectedValueOnce(error);
      const { getByText } = render(<SettingsScreen />);

      await fireEvent.press(getByText('Privacy Policy'));

      expect(mockFriendlyError).toHaveBeenCalledWith(error, { surface: 'settings.legal-links' });
    });
  });

  describe('Firebase Feature Flag', () => {
    const originalEnv = process.env.EXPO_PUBLIC_TURN_ON_FIREBASE;

    afterEach(() => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = originalEnv;
    });

    it('should check notification status correctly when Firebase is enabled', () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'true';
      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.GRANTED,
          notificationStatus: NOTIFICATION_STATUS.GRANTED,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('On')).toBeDefined();
    });

    it('should check permission status when Firebase is disabled', () => {
      process.env.EXPO_PUBLIC_TURN_ON_FIREBASE = 'false';
      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.GRANTED,
          notificationStatus: NOTIFICATION_STATUS.DENIED,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('On')).toBeDefined();
    });
  });
});
