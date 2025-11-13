import { resolveFriendlyError } from '@/errors/friendly';

describe('resolveFriendlyError', () => {
  it('maps network failures', () => {
    const result = resolveFriendlyError(new Error('Network request failed'));
    expect(result.code).toBe('network.offline');
    expect(result.title).toContain('Check your connection');
  });

  it('maps sqlite constraint errors', () => {
    const result = resolveFriendlyError(new Error('SQLITE_CONSTRAINT: UNIQUE failed'));
    expect(result.code).toBe('sqlite.constraint');
    expect(result.title).toContain('Already saved');
  });

  it('maps invalid credentials', () => {
    const result = resolveFriendlyError(new Error('Invalid login credentials'));
    expect(result.code).toBe('auth.invalid-credentials');
    expect(result.description).toContain('Double-check your credentials');
  });

  it('falls back to unknown copy', () => {
    const result = resolveFriendlyError('Some random issue');
    expect(result.code).toBe('unknown');
    expect(result.description).toContain('Some random issue');
  });
});
