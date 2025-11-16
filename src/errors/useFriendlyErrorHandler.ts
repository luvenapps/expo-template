import { useAnalytics } from '@/observability/AnalyticsProvider';
import type { ToastController } from '@/ui/components/Toast';
import { resolveFriendlyError, type FriendlyError } from './friendly';

type ErrorOptions = {
  surface: string;
  toast?: {
    retryLabel?: string;
    onRetry?: () => void;
  };
  suppressToast?: boolean;
};

function isFriendlyError(error: unknown): error is FriendlyError {
  return Boolean(
    error && typeof error === 'object' && 'code' in error && 'title' in error && 'type' in error,
  );
}

export function useFriendlyErrorHandler(toast: ToastController) {
  const analytics = useAnalytics();

  return (error: unknown, options: ErrorOptions) => {
    const friendly = isFriendlyError(error)
      ? (error as FriendlyError)
      : resolveFriendlyError(error);

    analytics.trackError?.(friendly.title, {
      surface: options.surface,
      code: friendly.code,
      originalMessage: friendly.originalMessage,
    });

    if (!options.suppressToast) {
      const retryLabel =
        options.toast?.retryLabel ?? (options.toast?.onRetry ? 'Retry' : undefined);

      toast.show({
        type: friendly.type,
        title: friendly.title,
        description: friendly.description,
        actionLabel: retryLabel,
        onAction: options.toast?.onRetry,
      });
    }

    return friendly;
  };
}
