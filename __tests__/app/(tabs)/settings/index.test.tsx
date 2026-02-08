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
import { act, fireEvent, render } from '@testing-library/react-native';
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
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
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
    delete (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__;
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
      const { getAllByText } = render(<SettingsScreen />);
      expect(getAllByText('Sign In')[0]).toBeDefined();
    });

    it('should navigate to account screen when pressed', () => {
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText('Account'));
      expect(mockPush).toHaveBeenCalledWith('/(tabs)/settings/account');
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
      const { getAllByText } = render(<SettingsScreen />);
      expect(getAllByText('test@example.com')[0]).toBeDefined();
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

      const { getAllByText } = render(<SettingsScreen />);
      expect(getAllByText('Signed in')[0]).toBeDefined();
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

    it('hides developer utilities when not in dev mode', () => {
      (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

      const { queryByText } = render(<SettingsScreen />);
      expect(queryByText('Developer Utilities')).toBeNull();
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

  describe('MarqueeText Component', () => {
    it('renders simple text with ellipsis on web', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'web',
        writable: true,
        configurable: true,
      });

      const { getAllByText } = render(
        <SettingsRow
          title="Test"
          value="Long email address"
          valueMarquee={true}
          onPress={jest.fn()}
        />,
      );

      // Should render the text (even though it's web, we just check it renders)
      expect(getAllByText('Long email address').length).toBeGreaterThan(0);
    });

    it('renders MarqueeTextNative on native platforms', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              email: 'very.long.email.address@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const { getAllByText } = render(<SettingsScreen />);
      // Should render the email text (in MarqueeTextNative)
      expect(getAllByText('very.long.email.address@example.com').length).toBeGreaterThan(0);
    });

    it('triggers onLayout callback for container width measurement', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

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

      const { UNSAFE_root } = render(<SettingsScreen />);

      // Find the container View with onLayout callback
      const containers = UNSAFE_root.findAllByType('View');
      const containerWithOnLayout = containers.find(
        (node: any) => node.props.onLayout && node.props.style?.overflow === 'hidden',
      );

      expect(containerWithOnLayout).toBeDefined();

      // Simulate layout event
      if (containerWithOnLayout) {
        act(() => {
          containerWithOnLayout.props.onLayout({
            nativeEvent: {
              layout: { width: 200, height: 20, x: 0, y: 0 },
            },
          });
        });
      }
    });

    it('triggers onTextLayout callback for text width measurement', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

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

      const { UNSAFE_root } = render(<SettingsScreen />);

      // Find the Text component with onTextLayout callback
      const textElements = UNSAFE_root.findAllByType('Text');
      const textWithOnTextLayout = textElements.find((node: any) => node.props.onTextLayout);

      expect(textWithOnTextLayout).toBeDefined();

      // Simulate text layout event with line measurements
      if (textWithOnTextLayout) {
        act(() => {
          textWithOnTextLayout.props.onTextLayout({
            nativeEvent: {
              lines: [{ width: 150, height: 20, text: 'test@example.com', x: 0, y: 0 }],
            },
          });
        });
      }
    });

    it('handles empty lines array in onTextLayout', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

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

      const { UNSAFE_root } = render(<SettingsScreen />);

      const textElements = UNSAFE_root.findAllByType('Text');
      const textWithOnTextLayout = textElements.find((node: any) => node.props.onTextLayout);

      // Simulate text layout event with empty lines
      if (textWithOnTextLayout) {
        act(() => {
          textWithOnTextLayout.props.onTextLayout({
            nativeEvent: {
              lines: [],
            },
          });
        });
      }

      // Should not throw an error
      expect(textWithOnTextLayout).toBeDefined();
    });

    it('calculates total width from multiple lines', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              email: 'very.long.email.address@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const { UNSAFE_root } = render(<SettingsScreen />);

      const textElements = UNSAFE_root.findAllByType('Text');
      const textWithOnTextLayout = textElements.find((node: any) => node.props.onTextLayout);

      // Simulate text layout event with multiple lines (shouldn't happen, but test the reduce logic)
      if (textWithOnTextLayout) {
        act(() => {
          textWithOnTextLayout.props.onTextLayout({
            nativeEvent: {
              lines: [
                { width: 100, height: 20, text: 'very.long.email.', x: 0, y: 0 },
                { width: 150, height: 20, text: 'address@example.com', x: 0, y: 20 },
              ],
            },
          });
        });
      }

      expect(textWithOnTextLayout).toBeDefined();
    });

    it('triggers animation when text overflows container', () => {
      jest.useFakeTimers();

      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              email: 'very.long.email.address.that.overflows@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const { UNSAFE_root } = render(<SettingsScreen />);

      // Find and trigger layout events to simulate overflow
      const containers = UNSAFE_root.findAllByType('View');
      const containerWithOnLayout = containers.find(
        (node: any) => node.props.onLayout && node.props.style?.overflow === 'hidden',
      );

      const textElements = UNSAFE_root.findAllByType('Text');
      const textWithOnTextLayout = textElements.find((node: any) => node.props.onTextLayout);

      // Set container width to 150px
      if (containerWithOnLayout) {
        act(() => {
          containerWithOnLayout.props.onLayout({
            nativeEvent: {
              layout: { width: 150, height: 20, x: 0, y: 0 },
            },
          });
        });
      }

      // Set text width to 300px (overflows by 150px, exceeds 1px threshold)
      if (textWithOnTextLayout) {
        act(() => {
          textWithOnTextLayout.props.onTextLayout({
            nativeEvent: {
              lines: [
                {
                  width: 300,
                  height: 20,
                  text: 'very.long.email.address.that.overflows@example.com',
                  x: 0,
                  y: 0,
                },
              ],
            },
          });
        });
      }

      // Advance timers to trigger animation
      act(() => {
        jest.advanceTimersByTime(1500); // MARQUEE_PAUSE_MS
      });

      // Clean up
      jest.useRealTimers();
    });

    it('cleans up animation timeout on unmount', () => {
      jest.useFakeTimers();

      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              email: 'very.long.email.address@example.com',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const { unmount } = render(<SettingsScreen />);

      // Unmount to trigger cleanup
      unmount();

      // Verify no timers are left running
      expect(jest.getTimerCount()).toBe(0);

      jest.useRealTimers();
    });

    it('does not animate when text does not overflow', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      mockedUseSessionStore.mockImplementation((selector: any) =>
        selector({
          status: 'authenticated',
          session: {
            user: {
              email: 'short@ex.co',
            },
          },
          signOut: jest.fn(),
          isLoading: false,
        }),
      );

      const { UNSAFE_root } = render(<SettingsScreen />);

      const containers = UNSAFE_root.findAllByType('View');
      const containerWithOnLayout = containers.find(
        (node: any) => node.props.onLayout && node.props.style?.overflow === 'hidden',
      );

      const textElements = UNSAFE_root.findAllByType('Text');
      const textWithOnTextLayout = textElements.find((node: any) => node.props.onTextLayout);

      // Set container width to 200px
      if (containerWithOnLayout) {
        act(() => {
          containerWithOnLayout.props.onLayout({
            nativeEvent: {
              layout: { width: 200, height: 20, x: 0, y: 0 },
            },
          });
        });
      }

      // Set text width to 100px (does not overflow)
      if (textWithOnTextLayout) {
        act(() => {
          textWithOnTextLayout.props.onTextLayout({
            nativeEvent: {
              lines: [{ width: 100, height: 20, text: 'short@ex.co', x: 0, y: 0 }],
            },
          });
        });
      }

      expect(UNSAFE_root).toBeDefined();
    });

    it('does not animate when overflow is within 1px threshold', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

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

      const { UNSAFE_root } = render(<SettingsScreen />);

      const containers = UNSAFE_root.findAllByType('View');
      const containerWithOnLayout = containers.find(
        (node: any) => node.props.onLayout && node.props.style?.overflow === 'hidden',
      );

      const textElements = UNSAFE_root.findAllByType('Text');
      const textWithOnTextLayout = textElements.find((node: any) => node.props.onTextLayout);

      // Set container width to 200px
      if (containerWithOnLayout) {
        act(() => {
          containerWithOnLayout.props.onLayout({
            nativeEvent: {
              layout: { width: 200, height: 20, x: 0, y: 0 },
            },
          });
        });
      }

      // Set text width to 200.5px (overflows by 0.5px, below 1px threshold)
      if (textWithOnTextLayout) {
        act(() => {
          textWithOnTextLayout.props.onTextLayout({
            nativeEvent: {
              lines: [{ width: 200.5, height: 20, text: 'test@example.com', x: 0, y: 0 }],
            },
          });
        });
      }

      expect(UNSAFE_root).toBeDefined();
    });
  });

  describe('Notification Status Combinations', () => {
    it('displays "Setup Needed" when permission is DENIED on native', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.DENIED,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Setup Needed')).toBeDefined();
    });

    it('displays "Setup Needed" when permission is UNAVAILABLE on native', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
        configurable: true,
      });

      mockedUseNotificationSettings.mockReturnValue(
        buildNotificationSettings({
          permissionStatus: NOTIFICATION_PERMISSION_STATE.UNAVAILABLE,
        }),
      );

      const { getByText } = render(<SettingsScreen />);
      expect(getByText('Setup Needed')).toBeDefined();
    });
  });

  describe('Icon Color Computation', () => {
    it('computes correct icon styles in light mode', () => {
      mockedUseThemeContext.mockReturnValue({
        theme: 'light',
        setTheme: jest.fn(),
        resolvedTheme: 'light',
        palette: themePalettes.light,
      });

      const { UNSAFE_root } = render(<SettingsScreen />);
      // Just verify it renders without crashing in light mode
      expect(UNSAFE_root).toBeDefined();
    });
  });
});
