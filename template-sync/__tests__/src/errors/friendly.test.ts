import { resolveFriendlyError } from '@/errors/friendly';

describe('resolveFriendlyError', () => {
  describe('Network errors', () => {
    it('maps "network request failed" errors', () => {
      const result = resolveFriendlyError(new Error('Network request failed'));
      expect(result.code).toBe('network.offline');
      expect(result.titleKey).toBe('errors.network.offline.title');
      expect(result.descriptionKey).toBe('errors.network.offline.description');
      expect(result.type).toBe('error');
      expect(result.originalMessage).toBe('Network request failed');
    });

    it('maps "failed to fetch" errors', () => {
      const result = resolveFriendlyError(new Error('Failed to fetch'));
      expect(result.code).toBe('network.offline');
      expect(result.titleKey).toBe('errors.network.offline.title');
      expect(result.type).toBe('error');
    });

    it('maps "request timed out" errors', () => {
      const result = resolveFriendlyError(new Error('Request timed out'));
      expect(result.code).toBe('network.offline');
      expect(result.titleKey).toBe('errors.network.offline.title');
      expect(result.type).toBe('error');
    });
  });

  describe('SQLite errors', () => {
    it('maps sqlite constraint errors', () => {
      const result = resolveFriendlyError(new Error('SQLITE_CONSTRAINT: UNIQUE failed'));
      expect(result.code).toBe('sqlite.constraint');
      expect(result.titleKey).toBe('errors.sqlite.constraint.title');
      expect(result.descriptionKey).toBe('errors.sqlite.constraint.description');
      expect(result.type).toBe('error');
    });

    it('maps sqlite storage full errors', () => {
      const result = resolveFriendlyError(new Error('Database or disk is full'));
      expect(result.code).toBe('sqlite.storage-full');
      expect(result.titleKey).toBe('errors.sqlite.storageFull.title');
      expect(result.descriptionKey).toBe('errors.sqlite.storageFull.description');
      expect(result.type).toBe('error');
    });

    it('maps sqlite busy errors', () => {
      const result = resolveFriendlyError(new Error('Database is locked'));
      expect(result.code).toBe('sqlite.busy');
      expect(result.titleKey).toBe('errors.sqlite.busy.title');
      expect(result.descriptionKey).toBe('errors.sqlite.busy.description');
      expect(result.type).toBe('info');
    });
  });

  describe('Auth errors', () => {
    it('maps invalid credentials', () => {
      const result = resolveFriendlyError(new Error('Invalid login credentials'));
      expect(result.code).toBe('auth.invalid-credentials');
      expect(result.titleKey).toBe('errors.auth.invalidCredentials.title');
      expect(result.descriptionKey).toBe('errors.auth.invalidCredentials.description');
      expect(result.type).toBe('error');
    });

    it('maps rate limit errors', () => {
      const result = resolveFriendlyError(new Error('Too many requests'));
      expect(result.code).toBe('auth.rate-limit');
      expect(result.titleKey).toBe('errors.auth.rateLimit.title');
      expect(result.descriptionKey).toBe('errors.auth.rateLimit.description');
      expect(result.type).toBe('info');
    });
  });

  describe('Notification errors', () => {
    it('maps notification permission errors', () => {
      const result = resolveFriendlyError(
        new Error('Failed to send a request to the edge function'),
      );
      expect(result.code).toBe('notifications.permission');
      expect(result.titleKey).toBe('errors.notifications.permission.title');
      expect(result.descriptionKey).toBe('errors.notifications.permission.description');
      expect(result.type).toBe('error');
    });
  });

  describe('Unknown errors', () => {
    it('falls back to unknown copy for unmatched Error instances', () => {
      const result = resolveFriendlyError(new Error('Some random issue'));
      expect(result.code).toBe('unknown');
      expect(result.titleKey).toBe('errors.unknown.title');
      expect(result.descriptionKey).toBeUndefined();
      expect(result.type).toBe('error');
    });

    it('falls back to unknown copy for string errors', () => {
      const result = resolveFriendlyError('Some random issue');
      expect(result.code).toBe('unknown');
      expect(result.titleKey).toBe('errors.unknown.title');
    });

    it('handles non-Error, non-string values', () => {
      const result = resolveFriendlyError({ unexpected: 'object' });
      expect(result.code).toBe('unknown');
      expect(result.titleKey).toBe('errors.unknown.title');
      expect(result.descriptionKey).toBeUndefined();
      expect(result.type).toBe('error');
    });

    it('handles null', () => {
      const result = resolveFriendlyError(null);
      expect(result.code).toBe('unknown');
      expect(result.titleKey).toBe('errors.unknown.title');
    });

    it('handles undefined', () => {
      const result = resolveFriendlyError(undefined);
      expect(result.code).toBe('unknown');
      expect(result.titleKey).toBe('errors.unknown.title');
    });

    it('handles number values', () => {
      const result = resolveFriendlyError(42);
      expect(result.code).toBe('unknown');
      expect(result.titleKey).toBe('errors.unknown.title');
    });

    it('handles empty string', () => {
      const result = resolveFriendlyError('');
      expect(result.code).toBe('unknown');
      expect(result.titleKey).toBe('errors.unknown.title');
    });
  });

  describe('originalMessage preservation', () => {
    it('preserves original error message in all cases', () => {
      const errorMessage = 'Network request failed due to connectivity';
      const result = resolveFriendlyError(new Error(errorMessage));
      expect(result.originalMessage).toBe(errorMessage);
    });
  });
});
