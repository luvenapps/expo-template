import { DOMAIN } from '@/config/domain.config';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { PrimaryButton, ScreenContainer, SettingsSection, useToast } from '@/ui';
import { Mail } from '@tamagui/lucide-icons';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';
import { Label, RadioGroup, Text, TextArea, XStack, YStack } from 'tamagui';

export default function GetHelpScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const [topic, setTopic] = useState<'feedback' | 'bug'>('feedback');
  const [message, setMessage] = useState('');
  const topicId = useId();
  const supportEmail = DOMAIN.app.supportEmail;
  const isWeb = Platform.OS === 'web';
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
      <SettingsSection
        title={t('settings.getHelpContact')}
        description={t('settings.getHelpDescription')}
        icon={<Mail size={20} color="$accentColor" marginBottom="$1" />}
      >
        <YStack gap="$5" width="100%" marginBottom={Platform.OS === 'web' ? '$1' : '$5'}>
          <YStack gap="$2">
            <Text fontSize="$5" fontWeight="600" color="$color" lineHeight="$6">
              {t('settings.getHelpTopicLabel')}
            </Text>
            <RadioGroup
              value={topic}
              onValueChange={(value) => setTopic(value as 'feedback' | 'bug')}
              aria-label="Support topic"
              gap="$3"
            >
              <YStack gap="$3">
                <XStack
                  gap="$3"
                  alignItems="center"
                  padding="$3"
                  borderRadius="$3"
                  backgroundColor={topic === 'feedback' ? '$backgroundHover' : 'transparent'}
                  borderWidth={1}
                  borderColor={topic === 'feedback' ? '$accentColor' : '$borderColor'}
                  pressStyle={{ backgroundColor: '$backgroundHover' }}
                >
                  <RadioGroup.Item
                    value="feedback"
                    id={`${topicId}-feedback`}
                    size="$5"
                    cursor="pointer"
                  >
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <YStack flex={1} gap="$1">
                    <Label
                      htmlFor={`${topicId}-feedback`}
                      cursor="pointer"
                      fontWeight="600"
                      fontSize="$4"
                      color="$color"
                      lineHeight="$5"
                    >
                      {t('settings.getHelpFeedback')}
                    </Label>
                    <Text fontSize={isWeb ? '$4' : '$3'} color="$colorMuted">
                      {t('settings.getHelpFeedbackDescription')}
                    </Text>
                  </YStack>
                </XStack>

                <XStack
                  gap="$3"
                  alignItems="center"
                  padding="$3"
                  borderRadius="$3"
                  backgroundColor={topic === 'bug' ? '$backgroundHover' : 'transparent'}
                  borderWidth={1}
                  borderColor={topic === 'bug' ? '$accentColor' : '$borderColor'}
                  pressStyle={{ backgroundColor: '$backgroundHover' }}
                >
                  <RadioGroup.Item value="bug" id={`${topicId}-bug`} size="$5" cursor="pointer">
                    <RadioGroup.Indicator />
                  </RadioGroup.Item>
                  <YStack flex={1} gap="$1">
                    <Label
                      htmlFor={`${topicId}-bug`}
                      cursor="pointer"
                      fontWeight="600"
                      fontSize="$4"
                      color="$color"
                      lineHeight="$5"
                    >
                      {t('settings.getHelpReportBug')}
                    </Label>
                    <Text fontSize={isWeb ? '$4' : '$3'} color="$colorMuted">
                      {t('settings.getHelpBugDescription')}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </RadioGroup>
          </YStack>

          <YStack gap="$2" marginBottom={-10}>
            <Text fontSize="$5" fontWeight="600" color="$color" lineHeight="$6">
              {t('settings.getHelpMessageLabel')}
            </Text>
            <TextArea
              value={message}
              onChangeText={setMessage}
              placeholder={t('settings.getHelpMessagePlaceholder')}
              placeholderTextColor="$colorMuted"
              minHeight={160}
              verticalAlign="top"
              borderWidth={1}
              borderColor="$borderColor"
              focusStyle={{
                borderColor: '$accentColor',
                borderWidth: 2,
              }}
            />
            <Text fontSize={isWeb ? '$4' : '$3'} color="$colorMuted">
              {t('settings.getHelpMessageHint')}
            </Text>
          </YStack>

          <PrimaryButton
            textProps={{ textTransform: 'capitalize' }}
            onPress={handleSubmit}
            disabled={!message.trim()}
            opacity={!message.trim() ? 0.5 : 1}
            icon={<Mail size={20} />}
          >
            {t('settings.getHelpSendEmail')}
          </PrimaryButton>
        </YStack>
      </SettingsSection>
    </ScreenContainer>
  );
}
