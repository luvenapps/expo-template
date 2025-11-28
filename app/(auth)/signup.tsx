import { signUpWithEmail } from '@/auth/service';
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
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, TextInput } from 'react-native';
import { Card, Form, View, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function SignUpScreen() {
  const router = useRouter();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);

  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const isFormValid = useMemo(() => {
    return email.trim() !== '' && password.trim().length >= 8 && confirmPassword.trim().length >= 8;
  }, [email, password, confirmPassword]);

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.show({
        type: 'error',
        title: t('auth.signup.missingTitle'),
        description: t('auth.signup.missingDescription'),
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.show({
        type: 'error',
        title: t('auth.signup.passwordMismatchTitle'),
        description: t('auth.signup.passwordMismatchDescription'),
      });
      return;
    }

    setIsSubmitting(true);
    const result = await signUpWithEmail(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      toast.show({
        type: 'success',
        title: t('auth.signup.checkEmailTitle'),
        description: t('auth.signup.checkEmailDescription'),
      });
      router.replace('/(auth)/login');
    } else {
      showFriendlyError(result.friendlyError ?? result.error ?? t('auth.signup.errorUnknown'), {
        surface: 'auth.signup.email',
      });
    }
  };

  return (
    <>
      <ScreenContainer
        alignItems="center"
        paddingHorizontal="$6"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
        }}
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
              <TitleText textAlign="center">{t('auth.signupTitle')}</TitleText>
              <SubtitleText textAlign="center">{t('auth.signupSubtitle')}</SubtitleText>
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
                onSubmitEditing={() => passwordInputRef.current?.focus?.()}
                returnKeyType="next"
              />

              <FormField
                ref={passwordInputRef}
                testID="password-field"
                inputTestID="password-input"
                label={t('auth.passwordLabel')}
                placeholder={t('auth.signup.passwordPlaceholder')}
                placeholderTextColor="$colorMuted"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmInputRef.current?.focus?.()}
                rightElement={
                  <View
                    position="absolute"
                    right="$0"
                    padding="$1"
                    testID="toggle-password-visibility"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    onPress={() => setShowPassword((prev) => !prev)}
                    hoverStyle={{ opacity: 0.7, cursor: 'pointer' }}
                    pressStyle={{ opacity: 0.5 }}
                    role="button"
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="$colorMuted" />
                    ) : (
                      <Eye size={20} color="$colorMuted" />
                    )}
                  </View>
                }
              />

              <FormField
                ref={confirmInputRef}
                testID="confirm-password-field"
                inputTestID="confirm-password-input"
                label={t('auth.signup.confirmPasswordLabel')}
                placeholder={t('auth.signup.confirmPasswordPlaceholder')}
                placeholderTextColor="$colorMuted"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                rightElement={
                  <View
                    position="absolute"
                    right="$0"
                    padding="$1"
                    testID="toggle-confirm-password-visibility"
                    aria-label={
                      showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')
                    }
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hoverStyle={{ opacity: 0.7, cursor: 'pointer' }}
                    pressStyle={{ opacity: 0.5 }}
                    role="button"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="$colorMuted" />
                    ) : (
                      <Eye size={20} color="$colorMuted" />
                    )}
                  </View>
                }
              />

              <Form.Trigger asChild>
                <PrimaryButton
                  testID="create-account-button"
                  disabled={!isFormValid || isSubmitting}
                  onPress={handleSubmit}
                >
                  {isSubmitting ? t('auth.signup.creating') : t('auth.signup.submit')}
                </PrimaryButton>
              </Form.Trigger>
            </Form>

            <YStack
              width="100%"
              alignItems="center"
              gap="$2"
              marginTop={Platform.OS === 'web' ? 0 : '$5'}
            >
              <CaptionText color="$colorMuted">{t('auth.signup.hasAccountPrompt')}</CaptionText>
              <PrimaryButton
                testID="sign-in-button"
                width="100%"
                onPress={() => router.replace('/(auth)/login')}
              >
                {t('auth.signIn')}
              </PrimaryButton>
            </YStack>
          </YStack>
        </Card>
      </ScreenContainer>
      <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />
    </>
  );
}
