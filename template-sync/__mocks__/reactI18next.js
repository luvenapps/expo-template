module.exports = {
  initReactI18next: {},
  I18nextProvider: ({ children }) => children,
  useTranslation: () => ({
    t: (key, opts) => key,
    i18n: { language: 'en', resolvedLanguage: 'en', languages: ['en'] },
  }),
};
