import { NOTIFICATION_PLATFORM_STATUS } from '@/notifications/status';
import { registerForPushNotifications, revokePushToken } from './firebasePush';

type RequestResult =
  | { status: typeof NOTIFICATION_PLATFORM_STATUS.GRANTED; token?: string }
  | { status: typeof NOTIFICATION_PLATFORM_STATUS.DENIED; message?: string }
  | { status: typeof NOTIFICATION_PLATFORM_STATUS.UNAVAILABLE; message?: string }
  | { status: 'error'; message?: string };

export async function requestPermission(): Promise<RequestResult> {
  const result = await registerForPushNotifications();

  if (result.status === 'registered') {
    return { status: NOTIFICATION_PLATFORM_STATUS.GRANTED, token: result.token };
  }

  if (result.status === NOTIFICATION_PLATFORM_STATUS.DENIED) {
    return { status: NOTIFICATION_PLATFORM_STATUS.DENIED };
  }

  if (result.status === NOTIFICATION_PLATFORM_STATUS.UNAVAILABLE) {
    return { status: NOTIFICATION_PLATFORM_STATUS.UNAVAILABLE };
  }

  return { status: 'error', message: result.message ?? 'Unknown error' };
}

export async function revokePermission() {
  await revokePushToken();
}
