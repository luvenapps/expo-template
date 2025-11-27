import i18n, { initializeI18n, setLanguage } from '@/i18n';

describe('i18n', () => {
  beforeEach(() => {
    // Reset to English before each test
    if (i18n.isInitialized) {
      setLanguage('en');
    } else {
      initializeI18n();
    }
  });

  it('initializes with fallback language', () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t('common.settings')).toBeDefined();
  });

  it('changes language and returns a translation string', () => {
    // Start with English
    setLanguage('en');
    expect(i18n.t('common.settings')).toBeTruthy();

    // Switch to Spanish
    setLanguage('es');
    expect(i18n.t('common.settings')).toBeTruthy();
  });

  it('falls back to English for missing translations', () => {
    setLanguage('es');
    // Test a key that doesn't exist - should fallback to the key itself
    const result = i18n.t('nonexistent.key');
    expect(result).toBe('nonexistent.key');
  });

  it('supports multiple languages', () => {
    // English
    setLanguage('en');
    expect(i18n.t('common.cancel')).toBeTruthy();

    // Spanish
    setLanguage('es');
    expect(i18n.t('common.cancel')).toBeTruthy();
  });

  it('returns translation keys for all common strings', () => {
    const keys = ['common.settings', 'common.cancel', 'common.save'];
    keys.forEach((key) => {
      const translation = i18n.t(key);
      expect(translation).toBeDefined();
      expect(translation).not.toBe('');
    });
  });
});
