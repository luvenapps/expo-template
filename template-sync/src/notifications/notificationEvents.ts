/**
 * Simple event emitter for notification triggers.
 * Allows data layer (e.g., localEntries.ts) to signal events
 * that the UI layer (with hook access) can respond to.
 */

import { createLogger } from '@/observability/logger';

type NotificationEventType = 'entry-created';
type NotificationEventListener = (context: string) => void;

const listeners = new Map<NotificationEventType, Set<NotificationEventListener>>();
const logger = createLogger('NotificationEvents');

/**
 * Subscribe to notification events
 */
export function onNotificationEvent(
  event: NotificationEventType,
  listener: NotificationEventListener,
): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(listener);

  // Return unsubscribe function
  return () => {
    listeners.get(event)?.delete(listener);
  };
}

/**
 * Emit a notification event
 */
export function emitNotificationEvent(event: NotificationEventType, context: string): void {
  const eventListeners = listeners.get(event);
  if (!eventListeners) return;

  eventListeners.forEach((listener) => {
    try {
      listener(context);
    } catch (error) {
      logger.error(`Error in ${event} listener:`, error);
    }
  });
}
