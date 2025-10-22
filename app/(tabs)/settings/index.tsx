import { Stack, useRouter } from 'expo-router';
import { Button, Paragraph, YStack } from 'tamagui';
import { ScreenContainer } from '@/ui';
import { useSessionStore } from '@/auth/session';

export default function SettingsScreen() {
  const router = useRouter();
  const status = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const signOut = useSessionStore((state) => state.signOut);
  const isLoading = useSessionStore((state) => state.isLoading);

  const handleAuthAction = async () => {
    if (status === 'authenticated') {
      await signOut();
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <ScreenContainer gap="$4">
        <YStack gap="$3" paddingVertical="$4">
          {status === 'authenticated' && session?.user?.email ? (
            <Paragraph textAlign="center" color="$colorMuted">
              Signed in as {session.user.email}
            </Paragraph>
          ) : (
            <Paragraph textAlign="center" color="$colorMuted">
              Sign in to sync your data across devices
            </Paragraph>
          )}
          <Button size="$4" disabled={isLoading} onPress={handleAuthAction}>
            {isLoading ? 'Loading…' : status === 'authenticated' ? 'Sign Out' : 'Sign In'}
          </Button>
        </YStack>

        <YStack height="$1" backgroundColor="$borderColor" marginVertical="$4" />

        <Paragraph textAlign="center" color="$colorMuted">
          Additional settings will arrive alongside theme controls and data export.
        </Paragraph>
      </ScreenContainer>
    </>
  );
}
