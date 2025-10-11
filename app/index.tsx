import { Stack } from 'expo-router';
import { Button, H2, Paragraph, YStack } from 'tamagui';

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Better Habits' }} />
      <YStack f={1} jc="center" ai="center" px="$6" bg="$background" gap="$4">
        <H2 fontWeight="700">Welcome to Better Habits</H2>
        <Paragraph ta="center" color="$colorMuted">
          This is a fresh start. We&apos;ll grow the experience together as we add offline data,
          sync, and more polished visuals.
        </Paragraph>
        <Button size="$4">Get Started</Button>
      </YStack>
    </>
  );
}
