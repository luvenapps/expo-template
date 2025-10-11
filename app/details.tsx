import { Stack } from 'expo-router';
import { Button, H3, Paragraph, YStack } from 'tamagui';

export default function DetailsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Details' }} />
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$6"
        gap="$4"
        backgroundColor="$background"
      >
        <H3 fontWeight="700">Details</H3>
        <Paragraph textAlign="center" color="$colorMuted">
          This screen will evolve into the detail view with charts, streaks, and history once
          the data layer is in place.
        </Paragraph>
        <Button size="$3" disabled>
          Coming Soon
        </Button>
      </YStack>
    </>
  );
}
