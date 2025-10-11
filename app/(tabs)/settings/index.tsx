import { Stack } from 'expo-router';
import { Paragraph } from 'tamagui';
import { ScreenContainer } from '@/ui';

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <ScreenContainer gap="$3">
        <Paragraph textAlign="center" color="$colorMuted">
          Settings content will arrive alongside sync, theme controls, and data export.
        </Paragraph>
      </ScreenContainer>
    </>
  );
}
