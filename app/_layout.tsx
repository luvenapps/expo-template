import { AppProviders } from '@/ui/providers/AppProviders';
import { ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import { ThemeProvider as NativeNavigationThemeProvider } from '@react-navigation/native';
import { DOMAIN } from '@/config/domain.config';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Paragraph, TamaguiProvider, Theme, XStack, YStack } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';
import { useTranslation } from 'react-i18next';

const appFonts = [
  {
    fontFamily: 'Inter',
    fontDefinitions: [
      { path: require('@tamagui/font-inter/otf/Inter-Regular.otf'), weight: 400 },
      { path: require('@tamagui/font-inter/otf/Inter-SemiBold.otf'), weight: 600 },
      { path: require('@tamagui/font-inter/otf/Inter-Bold.otf'), weight: 700 },
    ],
  },
];

// Suppress React Native Firebase v22 migration warnings
// These warnings reference a future API that doesn't exist yet in v23.5.0
LogBox.ignoreLogs(['This method is deprecated', 'migrating-to-v22']);

/* istanbul ignore next */
// Also suppress console warnings for Firebase
const originalWarn = console.warn;
/* istanbul ignore next */
console.warn = (...args) => {
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('migrating-to-v22') ||
      message.includes('React Native Firebase namespaced API'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { resolvedTheme, palette } = useThemeContext();
  const baseNavigationTheme = resolvedTheme === 'dark' ? DarkTheme : DefaultTheme;
  // Expo Router 58 and @react-navigation/elements consume separate theme contexts.
  // Keep router scenes and the auth back button on the same palette.
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      background: palette.background,
      card: palette.background,
      text: palette.text,
    },
  };
  // Production web uses the system fallback from the Inter font stack.
  const [fontsLoaded, fontError] = useFonts(Platform.OS === 'web' ? [] : appFonts);

  const isWeb = Platform.OS === 'web';
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={resolvedTheme}>
      <NativeNavigationThemeProvider value={navigationTheme}>
        <NavigationThemeProvider value={navigationTheme}>
          <Theme name={resolvedTheme}>
            <AppProviders>
              <YStack flex={1} backgroundColor="background">
                <YStack flex={1}>
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  </Stack>
                </YStack>
                {isWeb ? (
                  <XStack
                    width="100%"
                    borderTopWidth={1}
                    borderTopColor="border-color"
                    paddingHorizontal="6"
                    paddingTop="3"
                    paddingBottom="2"
                    alignItems="center"
                    justifyContent="center"
                    gap="$4"
                    flexShrink={0}
                    testID="web-footer"
                  >
                    <Paragraph color="colorMuted" fontSize="2">
                      {(t as unknown as (key: string, options?: Record<string, any>) => string)(
                        'footer.copyright',
                        {
                          year,
                          company: DOMAIN.app.companyName,
                        },
                      )}
                    </Paragraph>
                  </XStack>
                ) : null}
              </YStack>
              <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
            </AppProviders>
          </Theme>
        </NavigationThemeProvider>
      </NativeNavigationThemeProvider>
    </TamaguiProvider>
  );
}
