import { renderHook } from '@testing-library/react-native';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import type { ToastController } from '@/ui/components/Toast';
import { resolveFriendlyError, type FriendlyError } from '@/errors/friendly';

// Mock the analytics provider
const mockTrackError = jest.fn();
jest.mock('@/observability/AnalyticsProvider', () => ({
  useAnalytics: () => ({
    trackError: mockTrackError,
  }),
}));

// Mock resolveFriendlyError
jest.mock('@/errors/friendly', () => {
  const actual = jest.requireActual('@/errors/friendly');
  return {
    ...actual,
    resolveFriendlyError: jest.fn(),
  };
});

describe('useFriendlyErrorHandler', () => {
  let mockToast: ToastController;
  const mockResolveFriendlyError = resolveFriendlyError as jest.MockedFunction<
    typeof resolveFriendlyError
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast = {
      show: jest.fn(),
      dismiss: jest.fn(),
      clear: jest.fn(),
      messages: [],
    };
  });

  describe('isFriendlyError type guard', () => {
    it('handles FriendlyError objects', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        titleKey: 'errors.test.title',
        descriptionKey: 'errors.test.description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface' });

      expect(mockResolveFriendlyError).not.toHaveBeenCalled();
      expect(mockTrackError).toHaveBeenCalledWith('errors.test.title', {
        surface: 'test-surface',
        code: 'unknown',
        originalMessage: undefined,
      });
    });

    it('resolves non-FriendlyError objects', () => {
      const genericError = new Error('Generic error');
      const resolvedError: FriendlyError = {
        code: 'unknown',
        titleKey: 'errors.unknown.title',
        descriptionKey: 'errors.unknown.description',
        type: 'error',
      };

      mockResolveFriendlyError.mockReturnValue(resolvedError);

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(genericError, { surface: 'test-surface' });

      expect(mockResolveFriendlyError).toHaveBeenCalledWith(genericError);
      expect(mockTrackError).toHaveBeenCalledWith('errors.unknown.title', {
        surface: 'test-surface',
        code: 'unknown',
        originalMessage: undefined,
      });
    });

    it('handles null error', () => {
      const resolvedError: FriendlyError = {
        code: 'unknown',
        titleKey: 'errors.unknown.title',
        descriptionKey: undefined,
        type: 'error',
      };

      mockResolveFriendlyError.mockReturnValue(resolvedError);

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(null, { surface: 'test-surface' });

      expect(mockResolveFriendlyError).toHaveBeenCalledWith(null);
    });

    it('handles undefined error', () => {
      const resolvedError: FriendlyError = {
        code: 'unknown',
        titleKey: 'errors.unknown.title',
        descriptionKey: undefined,
        type: 'error',
      };

      mockResolveFriendlyError.mockReturnValue(resolvedError);

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(undefined, { surface: 'test-surface' });

      expect(mockResolveFriendlyError).toHaveBeenCalledWith(undefined);
    });

    it('handles objects without required FriendlyError fields', () => {
      const incompleteError = { code: 'test', title: 'Test' }; // missing 'type' field
      const resolvedError: FriendlyError = {
        code: 'unknown',
        title: 'Resolved error',
        description: undefined,
        type: 'error',
      };

      mockResolveFriendlyError.mockReturnValue(resolvedError);

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(incompleteError, { surface: 'test-surface' });

      expect(mockResolveFriendlyError).toHaveBeenCalledWith(incompleteError);
    });
  });

  describe('toast display', () => {
    it('shows toast by default', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface' });

      expect(mockToast.show).toHaveBeenCalledWith({
        id: undefined,
        type: 'error',
        title: 'Test Error',
        description: 'Test description',
        actionLabel: undefined,
        onAction: undefined,
      });
    });

    it('suppresses toast when suppressToast is true', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface', suppressToast: true });

      expect(mockToast.show).not.toHaveBeenCalled();
    });

    it('shows toast when suppressToast is false', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface', suppressToast: false });

      expect(mockToast.show).toHaveBeenCalled();
    });

    it('dismisses existing toast when id is provided', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface', toast: { id: 'existing-toast' } });

      expect(mockToast.dismiss).toHaveBeenCalledWith('existing-toast');
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-toast',
        }),
      );
    });

    it('does not dismiss when no id is provided', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface' });

      expect(mockToast.dismiss).not.toHaveBeenCalled();
    });
  });

  describe('retry functionality', () => {
    it('uses custom retryLabel when provided', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const onRetry = jest.fn();

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, {
        surface: 'test-surface',
        toast: {
          retryLabel: 'Try Again',
          onRetry,
        },
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        id: undefined,
        type: 'error',
        title: 'Test Error',
        description: 'Test description',
        actionLabel: 'Try Again',
        onAction: onRetry,
      });
    });

    it('defaults to "Retry" when onRetry is provided but no retryLabel', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const onRetry = jest.fn();

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, {
        surface: 'test-surface',
        toast: {
          onRetry,
        },
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        id: undefined,
        type: 'error',
        title: 'Test Error',
        description: 'Test description',
        actionLabel: 'Retry',
        onAction: onRetry,
      });
    });

    it('has no actionLabel when neither retryLabel nor onRetry is provided', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface' });

      expect(mockToast.show).toHaveBeenCalledWith({
        id: undefined,
        type: 'error',
        title: 'Test Error',
        description: 'Test description',
        actionLabel: undefined,
        onAction: undefined,
      });
    });

    it('has no actionLabel when toast config is not provided', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface' });

      expect(mockToast.show).toHaveBeenCalledWith({
        id: undefined,
        type: 'error',
        title: 'Test Error',
        description: 'Test description',
        actionLabel: undefined,
        onAction: undefined,
      });
    });

    it('uses custom retryLabel even when onRetry is not provided', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, {
        surface: 'test-surface',
        toast: {
          retryLabel: 'Custom Label',
        },
      });

      expect(mockToast.show).toHaveBeenCalledWith({
        id: undefined,
        type: 'error',
        title: 'Test Error',
        description: 'Test description',
        actionLabel: 'Custom Label',
        onAction: undefined,
      });
    });
  });

  describe('analytics tracking', () => {
    it('tracks error with originalMessage when present', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
        originalMessage: 'Original error message',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface' });

      expect(mockTrackError).toHaveBeenCalledWith('Test Error', {
        surface: 'test-surface',
        code: 'unknown',
        originalMessage: 'Original error message',
      });
    });

    it('tracks error without originalMessage', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      handler(friendlyError, { surface: 'test-surface' });

      expect(mockTrackError).toHaveBeenCalledWith('Test Error', {
        surface: 'test-surface',
        code: 'unknown',
        originalMessage: undefined,
      });
    });
  });

  describe('return value', () => {
    it('returns the friendly error with toastId', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      (mockToast.show as jest.Mock).mockReturnValue('toast-123');

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      const returned = handler(friendlyError, { surface: 'test-surface' });

      expect(returned.friendly).toBe(friendlyError);
      expect(returned.toastId).toBe('toast-123');
    });

    it('returns the resolved friendly error', () => {
      const genericError = new Error('Generic error');
      const resolvedError: FriendlyError = {
        code: 'unknown',
        title: 'Something went wrong',
        description: 'Generic error',
        type: 'error',
      };

      mockResolveFriendlyError.mockReturnValue(resolvedError);
      (mockToast.show as jest.Mock).mockReturnValue('toast-456');

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      const returned = handler(genericError, { surface: 'test-surface' });

      expect(returned.friendly).toBe(resolvedError);
      expect(returned.toastId).toBe('toast-456');
    });

    it('returns undefined toastId when toast is suppressed', () => {
      const friendlyError: FriendlyError = {
        code: 'unknown',
        title: 'Test Error',
        description: 'Test description',
        type: 'error',
      };

      const { result } = renderHook(() => useFriendlyErrorHandler(mockToast));
      const handler = result.current;

      const returned = handler(friendlyError, { surface: 'test-surface', suppressToast: true });

      expect(returned.friendly).toBe(friendlyError);
      expect(returned.toastId).toBeUndefined();
    });
  });
});
