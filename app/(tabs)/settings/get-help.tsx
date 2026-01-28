import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { PrimaryButton, ScreenContainer, SettingsSection, useToast } from '@/ui';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';
import { Input, Label, RadioGroup, Text, XStack, YStack } from 'tamagui';

export default function GetHelpScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const [topic, setTopic] = useState<'feedback' | 'bug'>('feedback');
  const [message, setMessage] = useState('');
  const topicId = useId();
  const supportEmail = 'support@luvenapps.com';
  const subject =
    topic === 'bug' ? t('settings.getHelpBugSubject') : t('settings.getHelpFeedbackSubject');

  const handleSubmit = async () => {
    const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(mailto);
    } catch (error) {
      showFriendlyError(error, { surface: 'settings.get-help' });
    }
  };

  return (
    <ScreenContainer gap="$5">
      <SettingsSection title={t('settings.getHelpContact')}>
        <YStack gap="$4" width="100%" marginBottom={Platform.OS === 'web' ? '$1' : '$5'}>
          <YStack gap="$2" marginBottom="$5">
            <Text fontSize="$5" fontWeight="600" marginBottom="$2">
              {t('settings.getHelpTopicLabel')}
            </Text>
            <RadioGroup
              value={topic}
              onValueChange={(value) => setTopic(value as 'feedback' | 'bug')}
              aria-label="Support topic"
              gap="$2"
            >
              <XStack gap="$5">
                <XStack gap="$3" alignItems="center">
                  <RadioGroup.Item
                    value="feedback"
                    id={`${topicId}-feedback`}
                    size="$7"
                    cursor="pointer"
                  >
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <Label
                    htmlFor={`${topicId}-feedback`}
                    cursor="pointer"
                    lineHeight="$4"
                    paddingVertical="$1"
                  >
                    {t('settings.getHelpFeedback')}
                  </Label>
                </XStack>
                <XStack gap="$3" alignItems="center">
                  <RadioGroup.Item value="bug" id={`${topicId}-bug`} size="$7" cursor="pointer">
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <Label
                    htmlFor={`${topicId}-bug`}
                    cursor="pointer"
                    lineHeight="$4"
                    paddingVertical="$1"
                  >
                    {t('settings.getHelpReportBug')}
                  </Label>
                </XStack>
              </XStack>
            </RadioGroup>
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600" marginBottom="$2">
              {t('settings.getHelpMessageLabel')}
            </Text>
            <Input
              multiline
              value={message}
              onChangeText={setMessage}
              placeholder={t('settings.getHelpMessagePlaceholder')}
              minHeight={140}
            />
          </YStack>

          <PrimaryButton textProps={{ textTransform: 'capitalize' }} onPress={handleSubmit}>
            {t('settings.getHelpSendEmail')}
          </PrimaryButton>
        </YStack>
      </SettingsSection>
    </ScreenContainer>
  );
}
