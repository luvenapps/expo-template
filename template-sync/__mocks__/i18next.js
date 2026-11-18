let currentLanguage = 'en';
const i18n = {
  isInitialized: false,
  language: currentLanguage,
  resolvedLanguage: currentLanguage,
  languages: [currentLanguage],
  __lastInitConfig: null,
  t: (key) => key,
  changeLanguage: (lng) => {
    currentLanguage = lng;
    i18n.language = lng;
    i18n.resolvedLanguage = lng;
    i18n.languages = [lng];
    return Promise.resolve();
  },
  use: () => i18n,
  init: (config) => {
    i18n.__lastInitConfig = config;
    if (config?.lng) {
      currentLanguage = config.lng;
      i18n.language = currentLanguage;
      i18n.resolvedLanguage = currentLanguage;
      i18n.languages = [currentLanguage];
    }
    i18n.isInitialized = true;
    return Promise.resolve();
  },
};

module.exports = i18n;
