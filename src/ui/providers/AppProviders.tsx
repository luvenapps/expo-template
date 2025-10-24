import { PropsWithChildren, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/state';
import { initSessionListener } from '@/auth/session';
import { useSync, pushOutbox, pullUpdates } from '@/sync';
import { tamaguiConfig } from '../../../tamagui.config';

const queryClient = getQueryClient();

export function AppProviders({ children }: PropsWithChildren) {
  useEffect(() => {
    initSessionListener();
  }, []);

  useSync({
    push: pushOutbox,
    pull: pullUpdates,
    enabled: false,
    autoStart: false,
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
