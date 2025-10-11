import { ScreenContainer } from '@/ui';
import { Stack } from 'expo-router';
import { Button, H3, Paragraph } from 'tamagui';

export default function DetailsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Details' }} />
      <ScreenContainer gap="$4">
        <H3 fontWeight="700">Details</H3>
        <Paragraph textAlign="center" color="$colorMuted">
          This screen will evolve into the detail view with charts, streaks, and history once
          the data layer is in place.
        </Paragraph>
        <Button size="$3" disabled>
          Coming Soon
        </Button>
      </ScreenContainer>
    </>
  );
}
