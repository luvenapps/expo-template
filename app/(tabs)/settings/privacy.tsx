import { DOMAIN } from '@/config/domain.config';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { useFeatureFlag } from '@/featureFlags/useFeatureFlag';
import { PrimaryButton, ScreenContainer, SettingsSection, useToast } from '@/ui';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Paragraph, YStack } from 'tamagui';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const { value: privacyUrl } = useFeatureFlag('legal_privacy_url', '');

  const openPrivacy = async () => {
    try {
      await WebBrowser.openBrowserAsync(privacyUrl);
    } catch (error) {
      showFriendlyError(error, { surface: 'settings.privacy' });
    }
  };

  return (
    <ScreenContainer gap="$5">
      <SettingsSection title={t('settings.privacyTitle')}>
        {privacyUrl ? (
          <PrimaryButton fontSize="$4" onPress={openPrivacy}>
            {t('settings.openPrivacy')}
          </PrimaryButton>
        ) : (
          <YStack gap="$3" width="100%">
            <Paragraph fontSize="$2" flex={1} flexWrap="wrap" marginBottom="$5">
              Last updated: January 28, 2026
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              {DOMAIN.app.displayName} (&quot;the App&quot;) is operated by {DOMAIN.app.companyName}{' '}
              (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). Your privacy is important to us.
              This Privacy Policy explains how we collect, use, store, and protect your information
              when you use the App. By using the App, you agree to the practices described in this
              Privacy Policy.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              1. Information We Collect
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              We collect only the information necessary to provide and improve the App.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              a. Information You Provide
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              Account information (such as email address, if you choose to sign in); habit data,
              reminders, and app preferences you create within the App; support communications you
              send to us (e.g., emails).
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              b. Automatically Collected Information
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              Basic device information (platform, OS version); app usage information needed for
              functionality and debugging; crash and error logs (if enabled on your device). We do
              not collect precise location data.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              2. How We Use Your Information
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              We use your information to provide core app functionality; sync and store your data
              (if applicable); improve app performance and reliability; respond to support requests;
              send optional notifications you enable. We do not use your data for advertising
              purposes.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              3. Data Storage & Security
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              Your data is stored securely using industry-standard practices. We take reasonable
              measures to protect your information from unauthorized access, loss, or misuse. No
              system is 100% secure, but we continuously work to safeguard your data.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              4. Data Sharing
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              We do not sell, rent, or trade your personal data. We may share limited data only with
              service providers that help operate the App (e.g., hosting, crash reporting), strictly
              for functionality; when required by law or to comply with legal obligations; to
              protect the rights, safety, or security of users or the App.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              5. Notifications
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              If you enable notifications, the App may send you reminders or updates. You can
              disable notifications at any time through your device or app settings.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              6. Data Retention & Deletion
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              Your data is retained only as long as necessary to provide the App. You may delete
              your account or local data through the App&apos;s settings. When data is deleted, it
              is removed from active systems within a reasonable timeframe.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              7. Children&apos;s Privacy
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              The App is not intended for children under the age of 13. We do not knowingly collect
              personal information from children. If you believe a child has provided us with
              personal data, please contact us and we will take appropriate action.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              8. Your Rights
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              Depending on your jurisdiction, you may have the right to access your personal data,
              request correction or deletion of your data, or withdraw consent where applicable. To
              exercise these rights, contact us at the email below.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              9. Changes to This Policy
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap" marginBottom="$5">
              We may update this Privacy Policy from time to time. Any changes will be reflected by
              updating the &quot;Last updated&quot; date. Continued use of the App means you accept
              the revised policy.
            </Paragraph>
            <Paragraph color="$color" fontWeight="700" fontSize="$4" flex={1} flexWrap="wrap">
              10. Contact Us
            </Paragraph>
            <Paragraph color="$colorMuted" fontSize="$3" flex={1} flexWrap="wrap">
              If you have questions or concerns about this Policy, contact us at:{'\n'}
              Email: {DOMAIN.app.supportEmail}
              {'\n'}Company: {DOMAIN.app.companyName}
              {'\n'}
            </Paragraph>
          </YStack>
        )}
      </SettingsSection>
    </ScreenContainer>
  );
}
