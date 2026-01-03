import { createLogger } from '@/observability/logger';

type ResetListener = () => void;

const resetListeners = new Set<ResetListener>();
const logger = createLogger('SQLite');

export function onDatabaseReset(listener: ResetListener) {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}

export function emitDatabaseReset() {
  resetListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      logger.error('Database reset listener failed:', error);
    }
  });
}
