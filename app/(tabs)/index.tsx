import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, H2, Paragraph, YStack } from 'tamagui';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: 'Home', headerShown: true }} />
      <YStack
        f={1}
        jc="center"
        ai="center"
        px="$6"
        paddingTop={insets.top + 24}
        paddingBottom={insets.bottom + 24}
        bg="$background"
        gap="$4"
      >
        <H2 fontWeight="700">Welcome</H2>
        <Paragraph ta="center" color="$colorMuted">
          This is a fresh start. We&apos;ll grow the experience together as we add offline data,
          sync, and more polished visuals.
        </Paragraph>
        <Button size="$4">Get Started</Button>
      </YStack>
    </>
  );
}
