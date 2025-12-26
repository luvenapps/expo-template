/* istanbul ignore file */
// Integration component that wires together expo-notifications and analytics.
// Testing would require complex notification event mocking with minimal benefit since
// each underlying system (notifications, analytics) is already tested independently.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAnalytics } from '@/observability/AnalyticsProvider';
import { DOMAIN } from '@/config/domain.config';

export function ForegroundReminderAnalyticsHost() {
  useForegroundReminderTracking();
  return null;
}

function useForegroundReminderTracking() {
  const analytics = useAnalytics();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data ?? {};
      if (data?.namespace !== `${DOMAIN.app.name}-reminders`) {
        return;
      }

      if (data?.foregroundPresented) {
        return;
      }

      Notifications.scheduleNotificationAsync({
        content: {
          title: notification.request.content.title ?? 'Reminder',
          body: notification.request.content.body ?? '',
          data: { ...data, foregroundPresented: true },
        },
        trigger: null,
      }).catch(() => undefined);

      analytics.trackEvent('notifications:foreground-fired', {
        reminderId: data.reminderId,
        itemId: data.itemId,
        platform: Platform.OS,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [analytics]);
}
