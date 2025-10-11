import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paragraph, YStack } from 'tamagui';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$6"
        paddingTop={insets.top + 24}
        paddingBottom={insets.bottom + 24}
        backgroundColor="$background"
        gap="$3"
      >
        <Paragraph textAlign="center" color="$colorMuted">
          Settings content will arrive alongside sync, theme controls, and data export.
        </Paragraph>
      </YStack>
    </>
  );
}
