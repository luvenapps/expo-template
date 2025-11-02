import { AppProviders } from '@/ui/providers/AppProviders';
import { ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { TamaguiProvider, Theme } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';

const defaultScreenOptions = {
  headerBackTitleVisible: false,
  headerBackTitle: '',
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerTitleStyle: {
    fontWeight: '600',
  },
} as const;

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
          <Stack screenOptions={defaultScreenOptions}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ title: 'Sign in' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
            <Stack.Screen name="details" />
          </Stack>
          <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        </AppProviders>
      </Theme>
    </NavigationThemeProvider>
  );
}
