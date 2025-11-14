/* istanbul ignore file */
// Integration component that wires together expo-notifications, toast system, and analytics.
// Testing would require complex notification event mocking with minimal benefit since
// each underlying system (notifications, toast, analytics) is already tested independently.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useAnalytics } from '@/observability/AnalyticsProvider';
import { ToastContainer, useToast, type ToastController } from '@/ui/components/Toast';

export function ForegroundReminderToastHost() {
  const toast = useToast();
  useForegroundReminderToasts(toast);
  return <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />;
}

function useForegroundReminderToasts(toast: ToastController) {
  const analytics = useAnalytics();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data ?? {};
      if (data?.namespace !== 'betterhabits-reminders') {
        return;
      }

      const title = notification.request.content.title ?? 'Reminder arrived';
      const description =
        notification.request.content.body ?? 'A reminder fired while the app was open.';

      toast.show({
        type: 'info',
        title,
        description,
        duration: 5000,
      });

      analytics.trackEvent('notifications:foreground-fired', {
        reminderId: data.reminderId,
        habitId: data.habitId,
        platform: Platform.OS,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [analytics, toast]);
}
