import {
  emitNotificationEvent,
  onNotificationEvent,
  type ForegroundNotificationEvent,
} from '@/observability/notificationEvents';

describe('notificationEvents', () => {
  it('notifies listeners with emitted events', () => {
    const listener = jest.fn();
    const event: ForegroundNotificationEvent = {
      name: 'notification:foreground:displayed',
      payload: {
        tag: 'habits',
        title: 'Hello',
        timestamp: '2025-01-01T00:00:00.000Z',
        platform: 'web',
      },
    };

    const unsubscribe = onNotificationEvent(listener);
    emitNotificationEvent(event);

    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = jest.fn();
    const event: ForegroundNotificationEvent = {
      name: 'notification:foreground:clicked',
      payload: {
        tag: 'habits',
        title: 'Click',
        timestamp: '2025-01-01T00:00:00.000Z',
        platform: 'web',
      },
    };

    const unsubscribe = onNotificationEvent(listener);
    unsubscribe();

    emitNotificationEvent(event);

    expect(listener).not.toHaveBeenCalled();
  });
});
