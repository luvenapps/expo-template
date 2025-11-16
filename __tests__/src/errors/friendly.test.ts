import { resolveFriendlyError } from '@/errors/friendly';

describe('resolveFriendlyError', () => {
  describe('Network errors', () => {
    it('maps "network request failed" errors', () => {
      const result = resolveFriendlyError(new Error('Network request failed'));
      expect(result.code).toBe('network.offline');
      expect(result.title).toContain('Check your connection');
      expect(result.description).toContain('could not reach the server');
      expect(result.type).toBe('error');
      expect(result.originalMessage).toBe('Network request failed');
    });

    it('maps "failed to fetch" errors', () => {
      const result = resolveFriendlyError(new Error('Failed to fetch'));
      expect(result.code).toBe('network.offline');
      expect(result.title).toContain('Check your connection');
      expect(result.type).toBe('error');
    });

    it('maps "request timed out" errors', () => {
      const result = resolveFriendlyError(new Error('Request timed out'));
      expect(result.code).toBe('network.offline');
      expect(result.title).toContain('Check your connection');
      expect(result.type).toBe('error');
    });
  });

  describe('SQLite errors', () => {
    it('maps sqlite constraint errors', () => {
      const result = resolveFriendlyError(new Error('SQLITE_CONSTRAINT: UNIQUE failed'));
      expect(result.code).toBe('sqlite.constraint');
      expect(result.title).toContain('Already saved');
      expect(result.description).toContain('entry already exists');
      expect(result.type).toBe('error');
    });

    it('maps sqlite storage full errors', () => {
      const result = resolveFriendlyError(new Error('Database or disk is full'));
      expect(result.code).toBe('sqlite.storage-full');
      expect(result.title).toContain('Device storage is full');
      expect(result.description).toContain('Free up space');
      expect(result.type).toBe('error');
    });

    it('maps sqlite busy errors', () => {
      const result = resolveFriendlyError(new Error('Database is locked'));
      expect(result.code).toBe('sqlite.busy');
      expect(result.title).toContain('Database is busy');
      expect(result.description).toContain('wait a moment');
      expect(result.type).toBe('info');
    });
  });

  describe('Auth errors', () => {
    it('maps invalid credentials', () => {
      const result = resolveFriendlyError(new Error('Invalid login credentials'));
      expect(result.code).toBe('auth.invalid-credentials');
      expect(result.title).toContain('Invalid email or password');
      expect(result.description).toContain('Double-check your credentials');
      expect(result.type).toBe('error');
    });

    it('maps rate limit errors', () => {
      const result = resolveFriendlyError(new Error('Too many requests'));
      expect(result.code).toBe('auth.rate-limit');
      expect(result.title).toContain('Too many attempts');
      expect(result.description).toContain('wait a moment');
      expect(result.type).toBe('info');
    });
  });

  describe('Notification errors', () => {
    it('maps notification permission errors', () => {
      const result = resolveFriendlyError(
        new Error('Failed to send a request to the edge function'),
      );
      expect(result.code).toBe('notifications.permission');
      expect(result.title).toContain('Notifications unavailable');
      expect(result.description).toContain('could not reach the notification service');
      expect(result.type).toBe('error');
    });
  });

  describe('Unknown errors', () => {
    it('falls back to unknown copy for unmatched Error instances', () => {
      const result = resolveFriendlyError(new Error('Some random issue'));
      expect(result.code).toBe('unknown');
      expect(result.title).toBe('Something went wrong');
      expect(result.description).toContain('Some random issue');
      expect(result.type).toBe('error');
    });

    it('falls back to unknown copy for string errors', () => {
      const result = resolveFriendlyError('Some random issue');
      expect(result.code).toBe('unknown');
      expect(result.description).toContain('Some random issue');
    });

    it('handles non-Error, non-string values', () => {
      const result = resolveFriendlyError({ unexpected: 'object' });
      expect(result.code).toBe('unknown');
      expect(result.title).toBe('Something went wrong');
      expect(result.description).toBe('Unexpected error');
      expect(result.type).toBe('error');
    });

    it('handles null', () => {
      const result = resolveFriendlyError(null);
      expect(result.code).toBe('unknown');
      expect(result.description).toBe('Unexpected error');
    });

    it('handles undefined', () => {
      const result = resolveFriendlyError(undefined);
      expect(result.code).toBe('unknown');
      expect(result.description).toBe('Unexpected error');
    });

    it('handles number values', () => {
      const result = resolveFriendlyError(42);
      expect(result.code).toBe('unknown');
      expect(result.description).toBe('Unexpected error');
    });

    it('handles empty string', () => {
      const result = resolveFriendlyError('');
      expect(result.code).toBe('unknown');
      expect(result.description).toBe('Please try again.');
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
