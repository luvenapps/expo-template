import { registerForPushNotifications, revokePushToken } from './firebasePush';

type RequestResult =
  | { status: 'granted'; token?: string }
  | { status: 'denied'; message?: string }
  | { status: 'unavailable'; message?: string }
  | { status: 'error'; message?: string };

export async function requestPermission(): Promise<RequestResult> {
  const result = await registerForPushNotifications();

  if (result.status === 'registered') {
    return { status: 'granted', token: result.token };
  }

  if (result.status === 'denied') {
    return { status: 'denied' };
  }

  if (result.status === 'unavailable') {
    return { status: 'unavailable' };
  }

  return { status: 'error', message: result.message ?? 'Unknown error' };
}

export async function revokePermission() {
  await revokePushToken();
}
