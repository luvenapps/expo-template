declare module 'i18next' {
  export interface I18n {
    isInitialized: boolean;
    t: (key: string) => string;
    changeLanguage: (lng: string) => Promise<void> | void;
    use: (plugin: any) => I18n;
    init: (config: any) => Promise<void> | void;
    language?: string;
    languages?: string[];
    resolvedLanguage?: string;
  }
  const i18n: I18n;
  export default i18n;
}

declare module 'react-i18next' {
  import type i18n from 'i18next';
  import * as React from 'react';
  export const initReactI18next: any;
  export function useTranslation(): { t: (key: string) => string; i18n: typeof i18n };
  export function I18nextProvider(props: {
    i18n: typeof i18n;
    children: React.ReactNode;
  }): JSX.Element;
}
