import { PropsWithChildren, useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/state';
import { initSessionListener, useSessionStore } from '@/auth/session';
import { useSync, pushOutbox, pullUpdates } from '@/sync';
import { tamaguiConfig } from '../../../tamagui.config';

const queryClient = getQueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  const sessionStatus = useSessionStore((state) => state.status);
  const isAuthenticated = sessionStatus === 'authenticated';
  const syncEnabled = Platform.OS !== 'web' && isAuthenticated;

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <TamaguiProvider config={tamaguiConfig}>
            {children}
            <StatusBar style="auto" />
          </TamaguiProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
