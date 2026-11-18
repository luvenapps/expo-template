export type ForegroundNotificationEventName =
  | 'notification:foreground:displayed'
  | 'notification:foreground:clicked'
  | 'notification:foreground:dismissed';

export type ForegroundNotificationEventPayload = {
  tag?: string;
  title?: string;
  timestamp: string;
  platform: 'web';
};

export type ForegroundNotificationEvent = {
  name: ForegroundNotificationEventName;
  payload: ForegroundNotificationEventPayload;
};

type NotificationEventListener = (event: ForegroundNotificationEvent) => void;

const listeners = new Set<NotificationEventListener>();

export function onNotificationEvent(listener: NotificationEventListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitNotificationEvent(event: ForegroundNotificationEvent) {
  listeners.forEach((listener) => listener(event));
}
