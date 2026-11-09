import { DOMAIN } from '@/config/domain.config';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { PrimaryButton, ScreenContainer, SettingsSection, useToast } from '@/ui';
import { Mail } from '@/ui/icons';
import { useOptionalThemeContext } from '@/ui/theme/ThemeProvider';
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
  const supportTextFont = Platform.OS === 'web' ? 'serif' : undefined;
  const themeContext = useOptionalThemeContext();
  const radioIndicatorColor = themeContext?.palette.text ?? 'white';
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
    <ScreenContainer gap="5">
      <SettingsSection
        title={t('settings.getHelpContact')}
        description={t('settings.getHelpDescription')}
        icon={
          <YStack marginBottom="1">
            <Mail size={20} color="accent-color" />
          </YStack>
        }
      >
        <YStack gap="5" width="100%" marginBottom={`${Platform.OS === 'web' ? '1' : '5'}`}>
          <YStack gap="$2">
            <Text
              fontFamily={supportTextFont}
              fontSize="5"
              fontWeight="600"
              color="color"
              lineHeight="5"
            >
              {t('settings.getHelpTopicLabel')}
            </Text>
            <RadioGroup
              value={topic}
              onValueChange={(value) => setTopic(value as 'feedback' | 'bug')}
              aria-label="Support topic"
              gap="3"
            >
              <YStack gap="3">
                <XStack
                  flexDirection="row"
                  gap="3"
                  alignItems="center"
                  padding="3"
                  borderRadius="3"
                  backgroundColor={`${topic === 'feedback' ? 'background-hover' : 'transparent'} press:background-hover`}
                  borderWidth={1}
                  borderColor={`${topic === 'feedback' ? 'accent-color' : 'border-color'}`}
                >
                  <RadioGroup.Item
                    value="feedback"
                    id={`${topicId}-feedback`}
                    size="legacy5"
                    width={Platform.OS === 'web' ? '12px' : undefined}
                    height={Platform.OS === 'web' ? '12px' : undefined}
                    paddingHorizontal={Platform.OS === 'web' ? 0 : undefined}
                    cursor="pointer"
                  >
                    {Platform.OS === 'web' ? (
                      <RadioGroup.Indicator
                        width={3}
                        height={3}
                        backgroundColor={radioIndicatorColor}
                      />
                    ) : (
                      <RadioGroup.Indicator width={4} height={4} backgroundColor="color" />
                    )}
                  </RadioGroup.Item>
                  <YStack flex={1} gap="1">
                    <Label
                      htmlFor={`${topicId}-feedback`}
                      cursor="pointer"
                      fontWeight="600"
                      fontSize="$4"
                      color="color"
                      lineHeight="$5"
                    >
                      {t('settings.getHelpFeedback')}
                    </Label>
                    <Text fontFamily={supportTextFont} fontSize="3" color="colorMuted">
                      {t('settings.getHelpFeedbackDescription')}
                    </Text>
                  </YStack>
                </XStack>

                <XStack
                  flexDirection="row"
                  gap="3"
                  alignItems="center"
                  padding="3"
                  borderRadius="3"
                  backgroundColor={`${topic === 'bug' ? 'background-hover' : 'transparent'} press:background-hover`}
                  borderWidth={1}
                  borderColor={`${topic === 'bug' ? 'accent-color' : 'border-color'}`}
                >
                  <RadioGroup.Item
                    value="bug"
                    id={`${topicId}-bug`}
                    size="legacy5"
                    width={Platform.OS === 'web' ? '12px' : undefined}
                    height={Platform.OS === 'web' ? '12px' : undefined}
                    paddingHorizontal={Platform.OS === 'web' ? 0 : undefined}
                    cursor="pointer"
                  >
                    {Platform.OS === 'web' ? (
                      <RadioGroup.Indicator
                        width={3}
                        height={3}
                        backgroundColor={radioIndicatorColor}
                      />
                    ) : (
                      <RadioGroup.Indicator width={4} height={4} backgroundColor="color" />
                    )}
                  </RadioGroup.Item>
                  <YStack flex={1} gap="1">
                    <Label
                      htmlFor={`${topicId}-bug`}
                      cursor="pointer"
                      fontWeight="600"
                      fontSize="$4"
                      color="color"
                      lineHeight="$5"
                    >
                      {t('settings.getHelpReportBug')}
                    </Label>
                    <Text fontFamily={supportTextFont} fontSize="3" color="colorMuted">
                      {t('settings.getHelpBugDescription')}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </RadioGroup>
          </YStack>

          <YStack gap="$2" marginBottom={-10}>
            <Text
              fontFamily={supportTextFont}
              fontSize="5"
              fontWeight="600"
              color="color"
              lineHeight="5"
            >
              {t('settings.getHelpMessageLabel')}
            </Text>
            <TextArea
              size="legacy4"
              fontFamily="body"
              fontSize={16}
              borderRadius="3"
              paddingHorizontal="3"
              paddingVertical="2"
              value={message}
              onChangeText={setMessage}
              placeholder={t('settings.getHelpMessagePlaceholder')}
              placeholderTextColor="colorMuted"
              minHeight={160}
              verticalAlign="top"
              borderWidth="1px focus:2px"
              borderColor="border-color focus:accent-color"
            />
            <Text fontFamily={supportTextFont} fontSize="3" color="colorMuted">
              {t('settings.getHelpMessageHint')}
            </Text>
          </YStack>

          <PrimaryButton
            textProps={{ textTransform: 'capitalize' }}
            onPress={handleSubmit}
            disabled={!message.trim()}
            gap={Platform.OS === 'web' ? '6px' : '$2'}
            icon={<Mail size={20} />}
          >
            {t('settings.getHelpSendEmail')}
          </PrimaryButton>
        </YStack>
      </SettingsSection>
    </ScreenContainer>
  );
}
