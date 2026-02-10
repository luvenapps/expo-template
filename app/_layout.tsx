import { AppProviders } from '@/ui/providers/AppProviders';
import { ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { DOMAIN } from '@/config/domain.config';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, Platform } from 'react-native';
import { Paragraph, TamaguiProvider, Theme, XStack, YStack } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';
import { useTranslation } from 'react-i18next';

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
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { resolvedTheme } = useThemeContext();
  const isWeb = Platform.OS === 'web';
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={resolvedTheme}>
      <NavigationThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Theme name={resolvedTheme}>
          <AppProviders>
            <YStack flex={1} backgroundColor="$background">
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
                  borderTopColor="$borderColor"
                  paddingHorizontal="$6"
                  paddingTop="$3"
                  paddingBottom="$2"
                  alignItems="center"
                  justifyContent="center"
                  gap="$4"
                  flexShrink={0}
                  testID="web-footer"
                >
                  <Paragraph color="$colorMuted" fontSize="$2">
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
    </TamaguiProvider>
  );
}
