import { useActiveBroadcastMessage, dismissBroadcastMessage } from '@/messaging/store';
import { useAnalytics } from '@/observability/AnalyticsProvider';
import { PrimaryButton, ScreenContainer, SecondaryButton } from '@/ui';
import { useRouter } from 'expo-router';
import { Paragraph, YStack, Card } from 'tamagui';

export default function MessagingPage() {
  const { message } = useActiveBroadcastMessage();
  const analytics = useAnalytics();
  const router = useRouter();

  if (!message) {
    return (
      <ScreenContainer>
        <Card padding="$4" bordered>
          <Paragraph>No announcements at the moment.</Paragraph>
        </Card>
      </ScreenContainer>
    );
  }

  const handleDismiss = () => {
    analytics.trackEvent?.('messaging:dismiss', { messageId: message.id, source: 'detail' });
    dismissBroadcastMessage(message.id);
    router.back();
  };

  const handleCTA = () => {
    analytics.trackEvent?.('messaging:cta', { messageId: message.id, source: 'detail' });
    if (message.ctaUrl) {
      // For now, just pop the screen; Settings banner handles URLs.
      router.back();
    } else {
      router.back();
    }
  };

  return (
    <ScreenContainer>
      <YStack gap="$4">
        <Card padding="$4" bordered>
          <Paragraph fontSize={24} fontWeight="700" marginBottom="$2">
            {message.title}
          </Paragraph>
          <Paragraph>{message.body}</Paragraph>
        </Card>
        <PrimaryButton onPress={handleCTA}>{message.ctaLabel ?? 'Got it'}</PrimaryButton>
        <SecondaryButton onPress={handleDismiss}>Dismiss message</SecondaryButton>
      </YStack>
    </ScreenContainer>
  );
}
