import { THEME_STORAGE_KEY } from '@/ui/theme/constants';
import { themePalettes } from '@/ui/theme/palette';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const backgroundColors = {
  light: themePalettes.light.background,
  dark: themePalettes.dark.background,
};

const themeInitializationScript = `(() => {
  try {
    const preference = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    const dark = preference === 'dark' || (
      preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    const theme = dark ? 'dark' : 'light';
    const colors = ${JSON.stringify(backgroundColors)};
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    root.style.setProperty('--app-background', colors[theme]);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors[theme]);
  } catch {
    // CSS media-query defaults still match the system theme when storage is unavailable.
  }
})();`;

const initialThemeStyles = `
  :root {
    color-scheme: light;
    --app-background: ${backgroundColors.light};
    background-color: var(--app-background);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) {
      color-scheme: dark;
      --app-background: ${backgroundColors.dark};
    }
  }
  :root[data-theme='light'] {
    color-scheme: light;
    --app-background: ${backgroundColors.light};
  }
  :root[data-theme='dark'] {
    color-scheme: dark;
    --app-background: ${backgroundColors.dark};
  }
  html, body, #root { min-height: 100%; }
  body { margin: 0; background-color: var(--app-background); }
  #root { min-height: 100vh; background-color: var(--app-background); }
`;

export default function RootHtml({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={backgroundColors.light} />
        <meta name="color-scheme" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: initialThemeStyles }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
