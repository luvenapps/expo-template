import { Stack } from 'expo-router';
import { Button, H2, Paragraph } from 'tamagui';
import { ScreenContainer } from '@/ui';

export default function TodayScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home', headerShown: true }} />
      <ScreenContainer gap="$4">
        <H2 fontWeight="700">Welcome</H2>
        <Paragraph textAlign="center" color="$colorMuted">
          This is a fresh start. We&apos;ll grow the experience together as we add offline data,
          sync, and more polished visuals.
        </Paragraph>
        <Button size="$4">Get Started</Button>
      </ScreenContainer>
    </>
  );
}
