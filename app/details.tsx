import { PrimaryButton, ScreenContainer } from '@/ui';
import { Stack } from 'expo-router';
import { H3, Paragraph } from 'tamagui';

export default function DetailsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Details' }} />
      <ScreenContainer gap="$4" alignItems="center">
        <H3 fontWeight="700">Details</H3>
        <Paragraph textAlign="center" color="$colorMuted">
          This screen will evolve into the detail view with charts, streaks, and history once the
          data layer is in place.
        </Paragraph>
        <PrimaryButton size="$3" disabled>
          Coming Soon
        </PrimaryButton>
      </ScreenContainer>
    </>
  );
}
