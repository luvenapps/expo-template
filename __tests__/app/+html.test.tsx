import RootHtml from '../../app/+html';
import { THEME_STORAGE_KEY } from '@/ui/theme/constants';
import { themePalettes } from '@/ui/theme/palette';
import React from 'react';

const { renderToStaticMarkup } = jest.requireActual('react-dom/server') as {
  renderToStaticMarkup: (element: React.ReactNode) => string;
};

jest.mock('expo-router/html', () => ({
  ScrollViewStyleReset: () => null,
  useServerDocumentContext: () => ({
    htmlAttributes: { 'data-html-context': 'present' },
    bodyAttributes: { 'data-body-context': 'present' },
    headNodes: <meta name="data-head-context" content="present" />,
    bodyNodes: <script data-body-node="present" />,
  }),
}));

describe('web root HTML theme initialization', () => {
  it('sets the saved or system theme background before body content renders', () => {
    const html = renderToStaticMarkup(
      <RootHtml>
        <div id="root">App</div>
      </RootHtml>,
    );

    expect(html.indexOf('<script')).toBeLessThan(html.indexOf('<body'));
    expect(html).toContain(THEME_STORAGE_KEY);
    expect(html).toContain(themePalettes.light.background);
    expect(html).toContain(themePalettes.dark.background);
    expect(html).toContain('--app-background');
    expect(html).toContain('data-html-context="present"');
    expect(html).toContain('data-body-context="present"');
    expect(html).toContain('name="data-head-context" content="present"');
    expect(html).toContain('data-body-node="present"');
  });
});
