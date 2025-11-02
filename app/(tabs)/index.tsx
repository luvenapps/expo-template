import { DOMAIN } from '@/config/domain.config';
import { PrimaryButton, ScreenContainer } from '@/ui';
import { useRouter } from 'expo-router';
import { H2, Paragraph } from 'tamagui';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <>
      <ScreenContainer gap="$4" alignItems="center">
        <H2 fontWeight="700" testID="welcome-title">
          Welcome to {DOMAIN.app.displayName}
        </H2>
        <Paragraph textAlign="center" color="$colorMuted">
          This is a fresh start. We&apos;ll grow the experience together as we add offline data,
          sync, and more polished visuals.
        </Paragraph>
        <PrimaryButton width="100%" onPress={() => router.push('/(tabs)/settings')}>
          Get Started
        </PrimaryButton>
      </ScreenContainer>
    </>
  );
}
