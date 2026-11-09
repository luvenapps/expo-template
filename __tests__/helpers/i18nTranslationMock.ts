import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';

type SupportedLanguage = 'en' | 'es';
type TranslationOptions = Record<string, unknown>;

export const mockTranslationLanguage: { current: SupportedLanguage } = { current: 'en' };

const resources: Record<SupportedLanguage, unknown> = { en, es };

function findResource(key: string) {
  return key.split('.').reduce<unknown>((value, segment) => {
    if (typeof value !== 'object' || value === null) {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, resources[mockTranslationLanguage.current]);
}

function interpolate(value: unknown, options: TranslationOptions): unknown {
  if (typeof value === 'string') {
    return value.replace(/{{\s*([^{}]+?)\s*}}/g, (placeholder, variable: string) => {
      const replacement = options[variable];
      return replacement === undefined ? placeholder : String(replacement);
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, options));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, interpolate(child, options)]),
    );
  }

  return value;
}

export function mockTranslate(key: string, options: TranslationOptions = {}) {
  const resource = findResource(key);
  return resource === undefined ? key : interpolate(resource, options);
}
