import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

const fallbackLng = 'en';

function getDeviceLanguage() {
  const locales = Localization.getLocales?.();
  const primary = locales && locales.length > 0 ? locales[0] : undefined;
  const tag = (primary?.languageCode ?? primary?.languageTag ?? fallbackLng) as string;
  return tag.split('-')[0];
}

export function initializeI18n() {
  if (i18n.isInitialized) return i18n;

  // eslint-disable-next-line import/no-named-as-default-member
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources,
    lng: getDeviceLanguage(),
    fallbackLng,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

  return i18n;
}

export function setLanguage(lng: string) {
  if (!i18n.isInitialized) {
    initializeI18n();
  }
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.changeLanguage(lng);
}

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

initializeI18n();

export default i18n;
