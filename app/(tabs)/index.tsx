import { DOMAIN } from '@/config/domain.config';
import { ScreenContainer } from '@/ui';
import { Stack } from 'expo-router';
import { Button, H2, Paragraph } from 'tamagui';

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: `${DOMAIN.app.displayName}`, headerShown: true }} />
      <ScreenContainer gap="$4">
        <H2 fontWeight="700" testID="welcome-title">
          Welcome to {DOMAIN.app.displayName}
        </H2>
        <Paragraph textAlign="center" color="$colorMuted">
          This is a fresh start. We&apos;ll grow the experience together as we add offline data,
          sync, and more polished visuals.
        </Paragraph>
        <Button size="$4">Get Started</Button>
      </ScreenContainer>
    </>
  );
}
