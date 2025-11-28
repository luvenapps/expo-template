import { useAnalytics } from '@/observability/AnalyticsProvider';
import type { ToastController } from '@/ui/components/Toast';
import { useTranslation } from 'react-i18next';
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
    error &&
      typeof error === 'object' &&
      'code' in error &&
      'type' in error &&
      ('titleKey' in error || 'title' in error),
  );
}

type HandlerResult = {
  friendly: FriendlyError;
  toastId?: string;
};

export function useFriendlyErrorHandler(toast: ToastController) {
  const analytics = useAnalytics();
  const { t } = useTranslation();

  return (error: unknown, options: ErrorOptions): HandlerResult => {
    const friendly = isFriendlyError(error)
      ? (error as FriendlyError)
      : resolveFriendlyError(error);

    // Translate the title and description (support legacy string fields)
    const title =
      friendly.title ?? (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
    const description =
      friendly.description ??
      (friendly.descriptionKey ? t(friendly.descriptionKey) : (friendly.originalMessage ?? ''));

    analytics.trackError?.(title, {
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
        title,
        description,
        actionLabel: retryLabel,
        onAction: options.toast?.onRetry,
      });
    }

    return { friendly, toastId };
  };
}
