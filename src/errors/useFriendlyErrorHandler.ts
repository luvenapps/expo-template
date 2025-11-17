import { useAnalytics } from '@/observability/AnalyticsProvider';
import type { ToastController } from '@/ui/components/Toast';
import { resolveFriendlyError, type FriendlyError } from './friendly';

type ErrorOptions = {
  surface: string;
  toast?: {
    retryLabel?: string;
    onRetry?: () => void;
    id?: string;
  };
  suppressToast?: boolean;
};

function isFriendlyError(error: unknown): error is FriendlyError {
  return Boolean(
    error && typeof error === 'object' && 'code' in error && 'title' in error && 'type' in error,
  );
}

type HandlerResult = {
  friendly: FriendlyError;
  toastId?: string;
};

export function useFriendlyErrorHandler(toast: ToastController) {
  const analytics = useAnalytics();

  return (error: unknown, options: ErrorOptions): HandlerResult => {
    const friendly = isFriendlyError(error)
      ? (error as FriendlyError)
      : resolveFriendlyError(error);

    analytics.trackError?.(friendly.title, {
      surface: options.surface,
      code: friendly.code,
      originalMessage: friendly.originalMessage,
    });

    let toastId: string | undefined;
    if (!options.suppressToast) {
      const existingId = options.toast?.id;
      if (existingId) {
        toast.dismiss(existingId);
      }

      const retryLabel =
        options.toast?.retryLabel ?? (options.toast?.onRetry ? 'Retry' : undefined);

      toastId = toast.show({
        id: existingId,
        type: friendly.type,
        title: friendly.title,
        description: friendly.description,
        actionLabel: retryLabel,
        onAction: options.toast?.onRetry,
      });
    }

    return { friendly, toastId };
  };
}
