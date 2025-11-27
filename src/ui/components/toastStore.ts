import type { ToastMessage, ToastType } from './Toast';

export function createToastStore(initialMessages: ToastMessage[] = []) {
  let messages = [...initialMessages];
  let localCounter = 0;

  const buildMessage = (message: ToastMessage) => {
    const id = message.id ?? `toast-${Date.now()}-${localCounter++}`;
    return { type: (message.type ?? 'info') as ToastType, duration: 4000, ...message, id };
  };

  return {
    get messages() {
      return messages;
    },
    show(message: ToastMessage) {
      const next = buildMessage(message);
      messages = [...messages, next];
      return next.id as string;
    },
    dismiss(id: string) {
      messages = messages.filter((msg) => msg.id !== id);
    },
    clear() {
      messages = [];
    },
  };
}
