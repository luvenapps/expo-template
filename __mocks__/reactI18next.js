module.exports = {
  initReactI18next: {},
  I18nextProvider: ({ children }) => children,
  useTranslation: () => ({ t: (key) => key }),
};
