import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { DOMAIN } from '@/config/domain.config';
import { analytics } from '@/observability/analytics';

import en from './locales/en.json';
import es from './locales/es.json';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
const resources = {
  en: { translation: en },
  es: { translation: es },
};

const fallbackLng = 'en';
const LANGUAGE_STORAGE_KEY = `${DOMAIN.app.storageKey}-language`;

function getDeviceLanguage() {
  const locales = Localization.getLocales?.();
  const primary = locales && locales.length > 0 ? locales[0] : undefined;
  const tag = (primary?.languageCode ?? primary?.languageTag ?? fallbackLng) as string;
  return tag.split('-')[0];
}

function getNativeStore() {
  try {
    if (isExpoGo) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv');
    return createMMKV({ id: `${DOMAIN.app.cursorStorageId}-i18n` });
  } catch {
    return null;
  }
}

function loadStoredLanguage(): string | null {
  if (Platform.OS === 'web') {
    try {
      return globalThis?.localStorage?.getItem(LANGUAGE_STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  try {
    return getNativeStore()?.getString(LANGUAGE_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function persistLanguage(lng: string) {
  if (Platform.OS === 'web') {
    try {
      globalThis?.localStorage?.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    getNativeStore()?.set(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
}

export function initializeI18n() {
  if (i18n.isInitialized) return i18n;

  // eslint-disable-next-line import/no-named-as-default-member
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources,
    lng: loadStoredLanguage() ?? getDeviceLanguage(),
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
  const previous = i18n.language?.split('-')[0];
  persistLanguage(lng);
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.changeLanguage(lng);
  if (previous && previous !== lng) {
    analytics.trackEvent('language:changed', {
      from: previous,
      to: lng,
      platform: Platform.OS,
    });
  }
}

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

initializeI18n();

export default i18n;
