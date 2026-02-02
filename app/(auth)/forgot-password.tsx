import { sendPasswordReset } from '@/auth/service';
import { isValidEmail } from '@/data/validation';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import {
  CaptionText,
  FormField,
  InlineError,
  PrimaryButton,
  ScreenContainer,
  SubtitleText,
  TitleText,
} from '@/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import { Card, Form, Separator, YStack } from 'tamagui';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const showFriendlyError = useFriendlyErrorHandler();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { t } = useTranslation();
  const trimmedEmail = email.trim();
  const isEmailValid = trimmedEmail !== '' && isValidEmail(trimmedEmail);

  const handleSubmit = async () => {
    if (!isEmailValid) {
      setErrorMessage(t('auth.reset.missingEmailDescription'));
      setStatusMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    const result = await sendPasswordReset(trimmedEmail);
    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage(t('auth.reset.successDescription'));
      router.replace('/(auth)/login');
    } else {
      const { friendly } = showFriendlyError(
        result.friendlyError ?? result.error ?? t('auth.reset.errorUnknown'),
        { surface: 'auth.password.reset' },
      );
      const friendlyMessage =
        friendly?.description ??
        (friendly?.descriptionKey ? t(friendly.descriptionKey) : undefined) ??
        friendly?.title ??
        (friendly?.titleKey ? t(friendly.titleKey) : undefined) ??
        result.error?.toString() ??
        t('auth.reset.errorUnknown');
      setErrorMessage(friendlyMessage);
    }
  };

  return (
    <>
      <ScreenContainer>
        <Card
          bordered
          elevate
          padding="$6"
          width="100%"
          maxWidth={440}
          backgroundColor="$backgroundStrong"
        >
          <YStack gap="$5" width="100%">
            <YStack gap="$2" alignItems="center">
              <TitleText textAlign="center">{t('auth.resetTitle')}</TitleText>
              <SubtitleText textAlign="center">{t('auth.resetSubtitle')}</SubtitleText>
            </YStack>

            {statusMessage ? (
              <CaptionText color="$accentColor" textAlign="center">
                {statusMessage}
              </CaptionText>
            ) : null}
            <InlineError message={errorMessage} testID="reset-error" />

            <Form onSubmit={handleSubmit} width="100%" gap="$4">
              <FormField
                testID="email-field"
                inputTestID="email-input"
                label={t('auth.emailLabel')}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor="$colorMuted"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
              />

              <Form.Trigger asChild>
                <PrimaryButton
                  testID="send-reset-link-button"
                  disabled={!isEmailValid || isSubmitting}
                  onPress={handleSubmit}
                >
                  {isSubmitting ? t('auth.reset.sending') : t('auth.reset.sendCta')}
                </PrimaryButton>
              </Form.Trigger>
            </Form>

            <Separator marginTop={Platform.OS === 'web' ? '$0' : '$4'}></Separator>

            <YStack
              width="100%"
              alignItems="center"
              gap="$2"
              marginBottom={Platform.OS === 'web' ? -10 : '$4'}
            >
              <CaptionText color="$colorMuted">{t('auth.reset.remembered')}</CaptionText>
              <PrimaryButton
                testID="back-to-sign-in-button"
                width="100%"
                onPress={() => router.replace('/(auth)/login')}
              >
                {t('auth.reset.backToSignIn')}
              </PrimaryButton>
            </YStack>
          </YStack>
        </Card>
      </ScreenContainer>
    </>
  );
}
