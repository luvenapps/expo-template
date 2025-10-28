import { PropsWithChildren, useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, YStack } from 'tamagui';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/state';
import { initSessionListener, useSessionStore } from '@/auth/session';
import { useSync, pushOutbox, pullUpdates } from '@/sync';
import { ThemeProvider, useThemeContext } from '@/ui/theme/ThemeProvider';
import { tamaguiConfig } from '../../../tamagui.config';

const queryClient = getQueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AppProvidersInner>{children}</AppProvidersInner>
    </ThemeProvider>
  );
}

function AppProvidersInner({ children }: PropsWithChildren) {
  const sessionStatus = useSessionStore((state) => state.status);
  const isAuthenticated = sessionStatus === 'authenticated';
  const syncEnabled = Platform.OS !== 'web' && isAuthenticated;
  const { palette, theme } = useThemeContext();

  useEffect(() => {
    initSessionListener();
  }, []);

  useSync({
    push: pushOutbox,
    pull: pullUpdates,
    enabled: syncEnabled,
    autoStart: syncEnabled,
    backgroundInterval: 15 * 60,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <TamaguiProvider config={tamaguiConfig}>
            <YStack
              flex={1}
              backgroundColor={palette.background}
              style={{ color: palette.text }}
              testID="app-root-container"
            >
              {children}
            </YStack>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          </TamaguiProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
