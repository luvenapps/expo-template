import { dismissBroadcastMessage, useActiveBroadcastMessage } from '@/messaging/store';
import { useAnalytics } from '@/observability/AnalyticsProvider';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Button, Card, Paragraph, XStack, YStack } from 'tamagui';

export function MessagingBanner() {
  const { message } = useActiveBroadcastMessage();
  const analytics = useAnalytics();
  const router = useRouter();
  const lastImpressionId = useRef<string | null>(null);

  useEffect(() => {
    if (message && lastImpressionId.current !== message.id) {
      lastImpressionId.current = message.id;
      analytics.trackEvent?.('messaging:impression', {
        messageId: message.id,
        audience: 'broadcast',
      });
    }
  }, [message, analytics]);

  if (!message) {
    return null;
  }

  const openDetail = () => {
    analytics.trackEvent?.('messaging:cta', { messageId: message.id });
    if (message.ctaUrl) {
      Linking.openURL(message.ctaUrl).catch(() => {
        /* ignore */
      });
      return;
    }
    router.push('/(tabs)/settings/messages');
  };

  const handleDismiss = () => {
    analytics.trackEvent?.('messaging:dismiss', { messageId: message.id });
    dismissBroadcastMessage(message.id);
  };

  return (
    <Card bordered padding="$4" backgroundColor="$surface" marginBottom="$4">
      <YStack gap="$2">
        <Paragraph fontWeight="700" fontSize={18}>
          {message.title}
        </Paragraph>
        <Paragraph numberOfLines={2} color="$colorMuted">
          {message.body}
        </Paragraph>
        <XStack gap="$2" marginTop="$2">
          <Button onPress={openDetail} flex={1} variant="outlined" height={52} fontSize={16}>
            {message.ctaLabel ?? 'Learn more'}
          </Button>
          <Button onPress={handleDismiss} flex={1} variant="outlined" height={52}>
            Dismiss
          </Button>
        </XStack>
      </YStack>
    </Card>
  );
}
