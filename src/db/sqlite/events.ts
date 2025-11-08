type ResetListener = () => void;

const resetListeners = new Set<ResetListener>();

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
      console.error('[SQLite] Database reset listener failed:', error);
    }
  });
}
