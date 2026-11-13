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

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const { value: privacyUrl } = useFeatureFlag('legal_privacy_url', '');
  const privacyContent = t('settings.privacyContent', {
    returnObjects: true,
    appName: DOMAIN.app.displayName,
    companyName: DOMAIN.app.companyName,
    supportEmail: DOMAIN.app.supportEmail,
  }) as unknown as LegalDocumentContent;

  const openPrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync(privacyUrl);
    } catch (error) {
      showFriendlyError(error, { surface: 'settings.privacy' });
    }
  };

  return (
    <ScreenContainer gap="5">
      <SettingsSection title={t('settings.privacyTitle')}>
        {privacyUrl ? (
          <PrimaryButton fontSize="$4" onPress={openPrivacy}>
            {t('settings.openPrivacy')}
          </PrimaryButton>
        ) : (
          <YStack gap="3" width="100%">
            <Paragraph fontSize="$2" flexShrink={0} flexWrap="wrap">
              {privacyContent.lastUpdated}
            </Paragraph>
            <Paragraph
              color="colorMuted"
              fontSize="$3"
              fontWeight="300"
              flexShrink={0}
              flexWrap="wrap"
              marginBottom="5"
            >
              {privacyContent.introduction}
            </Paragraph>
            {privacyContent.sections.map((section, index) => (
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
                  marginBottom={index < privacyContent.sections.length - 1 ? '5' : undefined}
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
