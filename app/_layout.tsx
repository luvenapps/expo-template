import { AppProviders } from '@/ui/providers/AppProviders';
import { Stack } from 'expo-router';

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
    <AppProviders>
      <Stack screenOptions={defaultScreenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ title: 'Sign in' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="details" />
      </Stack>
    </AppProviders>
  );
}
