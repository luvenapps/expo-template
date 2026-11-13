import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';

function sectionIds(document: { sections: { id: string }[] }) {
  return document.sections.map(({ id }) => id);
}

describe('localized legal documents', () => {
  it('keeps Terms of Service sections aligned across languages', () => {
    expect(sectionIds(es.settings.termsContent)).toEqual(sectionIds(en.settings.termsContent));
    expect(es.settings.termsContent.sections.map(({ heading }) => heading)).not.toEqual(
      en.settings.termsContent.sections.map(({ heading }) => heading),
    );
  });

  it('keeps Privacy Policy sections aligned across languages', () => {
    expect(sectionIds(es.settings.privacyContent)).toEqual(sectionIds(en.settings.privacyContent));
    expect(es.settings.privacyContent.sections.map(({ heading }) => heading)).not.toEqual(
      en.settings.privacyContent.sections.map(({ heading }) => heading),
    );
  });
});
