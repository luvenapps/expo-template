import { AppProviders } from '@/ui/providers/AppProviders';
import { ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { TamaguiProvider, Theme } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';

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

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={resolvedTheme}>
      <NavigationThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Theme name={resolvedTheme}>
          <AppProviders>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
          </AppProviders>
        </Theme>
      </NavigationThemeProvider>
    </TamaguiProvider>
  );
}
