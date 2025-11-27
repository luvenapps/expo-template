const i18n = {
  isInitialized: true,
  t: (key) => key,
  changeLanguage: jest.fn(() => Promise.resolve()),
  use: () => i18n,
  init: () => Promise.resolve(),
};

module.exports = i18n;
