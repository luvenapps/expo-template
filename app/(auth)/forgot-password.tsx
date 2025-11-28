import { sendPasswordReset } from '@/auth/service';
import { isValidEmail } from '@/data/validation';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import {
  CaptionText,
  FormField,
  PrimaryButton,
  ScreenContainer,
  SubtitleText,
  TitleText,
  ToastContainer,
  useToast,
} from '@/ui';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Card, Form, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();
  const errorToastId = useRef<string | null>(null);

  const trimmedEmail = email.trim();
  const isEmailValid = trimmedEmail !== '' && isValidEmail(trimmedEmail);

  const handleSubmit = async () => {
    if (!isEmailValid) {
      toast.show({
        type: 'error',
        title: t('auth.reset.missingEmailTitle'),
        description: t('auth.reset.missingEmailDescription'),
      });
      return;
    }

    setIsSubmitting(true);
    const result = await sendPasswordReset(trimmedEmail);
    setIsSubmitting(false);

    if (result.success) {
      toast.show({
        type: 'success',
        title: t('auth.reset.successTitle'),
        description: t('auth.reset.successDescription'),
      });
      router.replace('/(auth)/login');
    } else {
      const { toastId } = showFriendlyError(
        result.friendlyError ?? result.error ?? t('auth.reset.errorUnknown'),
        {
          surface: 'auth.password.reset',
          toast: {
            id: errorToastId.current ?? undefined,
          },
        },
      );
      errorToastId.current = toastId ?? errorToastId.current;
    }
  };

  return (
    <>
      <ScreenContainer
        alignItems="center"
        paddingHorizontal="$6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
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

            <YStack
              width="100%"
              alignItems="center"
              gap="$2"
              marginTop={Platform.OS === 'web' ? 0 : '$5'}
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
      <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />
    </>
  );
}
