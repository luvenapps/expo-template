import { Fragment } from 'react';
import { DOMAIN } from '@/config/domain.config';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';
import { PrimaryButton, ScreenContainer, SettingsSection, useToast } from '@/ui';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Paragraph, YStack } from 'tamagui';

type LegalDocumentSection = {
  id: string;
  heading: string;
  body: string;
};

type LegalDocumentContent = {
  lastUpdated: string;
  introduction: string;
  sections: LegalDocumentSection[];
};

export default function TermsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const { value: termsUrl } = useFeatureFlag('legal_terms_url', '');
  const termsContent = t('settings.termsContent', {
    returnObjects: true,
    appName: DOMAIN.app.displayName,
    companyName: DOMAIN.app.companyName,
    supportEmail: DOMAIN.app.supportEmail,
  }) as unknown as LegalDocumentContent;

  const openTerms = async () => {
    try {
      await WebBrowser.openBrowserAsync(termsUrl);
    } catch (error) {
      showFriendlyError(error, { surface: 'settings.terms' });
    }
  };

  return (
    <ScreenContainer gap="5">
      <SettingsSection title={t('settings.termsTitle')}>
        {termsUrl ? (
          <PrimaryButton fontSize="$4" onPress={openTerms}>
            {t('settings.openTerms')}
          </PrimaryButton>
        ) : (
          <YStack gap="3" width="100%">
            <Paragraph fontSize="$2" flexShrink={0} flexWrap="wrap">
              {termsContent.lastUpdated}
            </Paragraph>
            <Paragraph
              color="colorMuted"
              fontSize="$3"
              fontWeight="300"
              flexShrink={0}
              flexWrap="wrap"
              marginBottom="5"
            >
              {termsContent.introduction}
            </Paragraph>
            {termsContent.sections.map((section, index) => (
              <Fragment key={section.id}>
                <Paragraph
                  color="color"
                  fontWeight="400"
                  fontSize="$4"
                  flexShrink={0}
                  flexWrap="wrap"
                >
                  {section.heading}
                </Paragraph>
                <Paragraph
                  color="colorMuted"
                  fontSize="$3"
                  fontWeight="300"
                  flexShrink={0}
                  flexWrap="wrap"
                  marginBottom={index < termsContent.sections.length - 1 ? '5' : undefined}
                >
                  {section.body}
                </Paragraph>
              </Fragment>
            ))}
          </YStack>
        )}
      </SettingsSection>
    </ScreenContainer>
  );
}
