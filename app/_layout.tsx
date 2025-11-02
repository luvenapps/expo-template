import { AppProviders } from '@/ui/providers/AppProviders';
import { ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, Theme } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <TamaguiProvider config={tamaguiConfig}>
        <ThemedApp />
      </TamaguiProvider>
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { resolvedTheme } = useThemeContext();

  return (
    <NavigationThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Theme name={resolvedTheme}>
        <AppProviders>
          <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ title: 'Sign in' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="details" />
          </Stack>
          <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        </AppProviders>
      </Theme>
    </NavigationThemeProvider>
  );
}
