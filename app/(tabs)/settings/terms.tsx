import { DOMAIN } from '@/config/domain.config';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';
import { PrimaryButton, ScreenContainer, SettingsSection, useToast } from '@/ui';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Paragraph, YStack } from 'tamagui';

export default function TermsScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const { value: termsUrl } = useFeatureFlag('legal_terms_url', '');

  const openTerms = async () => {
    try {
      await WebBrowser.openBrowserAsync(termsUrl);
    } catch (error) {
      showFriendlyError(error, { surface: 'settings.terms' });
    }
  };

  return (
    <ScreenContainer gap="$5">
      <SettingsSection title={t('settings.termsTitle')}>
        {termsUrl ? (
          <PrimaryButton fontSize="$4" onPress={openTerms}>
            {t('settings.openTerms')}
          </PrimaryButton>
        ) : (
          <YStack gap="$3" width="100%">
            <Paragraph fontSize="$2" flex={1} flexWrap="wrap">
              Last updated: January 28, 2026
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              Welcome to {DOMAIN.app.displayName} (&quot;the App&quot;), operated by{' '}
              {DOMAIN.app.companyName} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By
              accessing or using the App, you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the App.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              1. Eligibility
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              You must be at least 13 years old (or the minimum legal age required in your
              jurisdiction) to use the App. By using the App, you represent and warrant that you
              meet this requirement.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              2. Account & Access
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              You are responsible for maintaining the confidentiality of your account credentials.
              You agree to provide accurate and complete information when creating or using an
              account. We reserve the right to suspend or terminate access if these Terms are
              violated.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              3. Use of the App
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              You agree to use the App only for lawful purposes and in accordance with these Terms.
              You may not: reverse engineer, decompile, or attempt to extract source code; interfere
              with or disrupt the App or its services; use the App in a way that violates any
              applicable laws or regulations.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              4. User Data & Content
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              Any data or content you create in the App remains yours. By using the App, you grant
              Luven LLC permission to store and process your data solely to provide and improve the
              App&apos;s functionality. We do not claim ownership over your personal data or
              content. For details on how data is collected and handled, please refer to our Privacy
              Policy.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              5. Notifications & Communications
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              If you enable notifications, you consent to receiving in-app or push notifications
              related to your use of the App. You can disable notifications at any time through your
              device or app settings.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              6. Availability & Changes
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              The App is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We may
              modify, suspend, or discontinue any part of the App at any time without notice. We may
              update these Terms periodically. Continued use of the App after changes are posted
              constitutes acceptance of the updated Terms.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              7. Intellectual Property
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              All trademarks, logos, designs, and app content (excluding user-generated data) are
              the property of Luven LLC and are protected by applicable intellectual property laws.
              You may not use them without prior written permission.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              8. Disclaimer of Warranties
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              We make no warranties or guarantees that: the App will be uninterrupted or error-free;
              data will always be available or preserved; the App will meet your specific needs or
              expectations. Use of the App is at your own risk.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              9. Limitation of Liability
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              To the maximum extent permitted by law, Luven LLC shall not be liable for any
              indirect, incidental, consequential, or special damages arising out of or related to
              your use of the App.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              10. Termination
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              We may suspend or terminate your access to the App at any time if you violate these
              Terms or misuse the service.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              11. Governing Law
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              These Terms are governed by the laws of the United States, without regard to
              conflict-of-law principles.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              12. Contact
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap">
              If you have any questions about these Terms, please contact us:{'\n'}
              Email: {DOMAIN.app.supportEmail}
              {'\n'}Company: {DOMAIN.app.companyName}
            </Paragraph>
          </YStack>
        )}
      </SettingsSection>
    </ScreenContainer>
  );
}
