/* istanbul ignore file */
import { useEffect, useMemo, useState } from 'react';
import { XStack, YStack, Paragraph } from 'tamagui';

export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
  id?: string;
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

let toastIdCounter = 0;

export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const api = useMemo(
    () => ({
      show: (message: ToastMessage) => {
        const id = message.id ?? `toast-${Date.now()}-${toastIdCounter++}`;
        setMessages((prev) => [...prev, { type: 'info', duration: 4000, ...message, id }]);
        return id;
      },
      dismiss: (id: string) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
      },
      clear: () => setMessages([]),
    }),
    [],
  );

  return { messages, ...api };
}

export type ToastController = ReturnType<typeof useToast>;

type ToastContainerProps = {
  messages: ToastMessage[];
  dismiss: (id: string) => void;
  testID?: string;
};

export function ToastContainer({ messages, dismiss, testID }: ToastContainerProps) {
  useEffect(() => {
    const timers = messages.map((message) => {
      if (!message.duration) return undefined;
      return setTimeout(() => dismiss(message.id!), message.duration);
    });

    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [messages, dismiss]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <YStack
      position="absolute"
      top="$4"
      width="90%"
      maxWidth={480}
      alignSelf="center"
      gap="$2"
      pointerEvents="box-none"
      zIndex={1000}
      testID={testID}
    >
      {messages.map((message) => (
        <ToastItem key={message.id} message={message} onDismiss={() => dismiss(message.id!)} />
      ))}
    </YStack>
  );
}

type ToastItemProps = {
  message: ToastMessage;
  onDismiss: () => void;
};

function ToastItem({ message, onDismiss }: ToastItemProps) {
  const { type = 'info', title, description, actionLabel, onAction, id } = message;
  const colors: Record<ToastType, { background: string; text: string }> = {
    success: { background: '$backgroundStrong', text: '$color' },
    error: { background: '$dangerBackground', text: '$dangerColor' },
    info: { background: '$surface', text: '$color' },
  };

  const handleAction = () => {
    onAction?.();
    onDismiss();
  };

  return (
    <XStack
      backgroundColor={colors[type].background}
      borderRadius="$4"
      padding="$3"
      justifyContent="space-between"
      alignItems="center"
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.15}
      shadowRadius={4}
      borderWidth={1}
      borderColor="$borderColor"
      testID={id ? `toast-${id}` : undefined}
    >
      <YStack flex={1} paddingRight="$3" gap="$1">
        <Paragraph
          fontWeight="600"
          color={colors[type].text}
          testID={id ? `toast-${id}-title` : undefined}
        >
          {title}
        </Paragraph>
        {description ? (
          <Paragraph
            fontSize="$3"
            color="$colorMuted"
            testID={id ? `toast-${id}-description` : undefined}
          >
            {description}
          </Paragraph>
        ) : null}
        {actionLabel && onAction ? (
          <Paragraph
            fontSize="$3"
            fontWeight="600"
            color="$accentColor"
            onPress={handleAction}
            hoverStyle={{ opacity: 0.8, cursor: 'pointer' }}
            testID={id ? `toast-${id}-action` : undefined}
          >
            {actionLabel}
          </Paragraph>
        ) : null}
      </YStack>
      <Paragraph
        color="$colorMuted"
        onPress={onDismiss}
        hoverStyle={{ opacity: 0.8, cursor: 'pointer' }}
        testID={id ? `toast-${id}-dismiss` : undefined}
      >
        ×
      </Paragraph>
    </XStack>
  );
}
