import { Stack } from 'expo-router';
import { Button, Paragraph, YStack } from 'tamagui';

export default function LoginScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sign in', headerShown: true }} />
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" paddingHorizontal="$6">
        <Paragraph textAlign="center" color="$colorMuted">
          Sign in form coming soon.
        </Paragraph>
        <Button size="$4" disabled>
          Continue
        </Button>
      </YStack>
    </>
  );
}
