import { signUpWithEmail } from '@/auth/service';
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
  useToast,
} from '@/ui';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, TextInput } from 'react-native';
import { Card, Form, View, YStack } from 'tamagui';

export default function SignUpScreen() {
  const router = useRouter();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);

  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmInputRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phoneNumber.trim();
  const isEmailValid = useMemo(() => isValidEmail(trimmedEmail), [trimmedEmail]);

  const isFormValid = useMemo(() => {
    return (
      trimmedName !== '' &&
      isEmailValid &&
      password.trim().length >= 8 &&
      confirmPassword.trim().length >= 8
    );
  }, [confirmPassword, isEmailValid, password, trimmedName]);

  const validateEmail = (value: string) => {
    const nextEmail = value.trim();
    if (!nextEmail || !isValidEmail(nextEmail)) {
      setEmailError(t('auth.signup.invalidEmailDescription'));
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    if (value.length < phoneNumber.length) {
      setPhoneNumber(value);
      return;
    }
    const cleaned = value.replace(/[^\d+]/g, '');
    if (!cleaned) {
      setPhoneNumber('');
      return;
    }
    const formatter = cleaned.startsWith('+') ? new AsYouType() : new AsYouType('US');
    setPhoneNumber(formatter.input(cleaned));
  };

  const parsePhoneInput = (value: string) => {
    const cleaned = value.trim().replace(/[^\d+]/g, '');
    if (!cleaned) return null;
    return cleaned.startsWith('+')
      ? parsePhoneNumberFromString(cleaned)
      : parsePhoneNumberFromString(cleaned, 'US');
  };

  const normalizePhoneNumber = (value: string) => {
    const cleaned = value.trim().replace(/[\s\-()]/g, '');
    if (!cleaned) return '';
    const parsed = cleaned.startsWith('+')
      ? parsePhoneNumberFromString(cleaned)
      : parsePhoneNumberFromString(cleaned, 'US');
    return parsed?.number;
  };

  const handleSubmit = async () => {
    if (!trimmedName) {
      setErrorMessage(t('auth.signup.missingNameDescription'));
      setStatusMessage(null);
      return;
    }

    if (!trimmedEmail || !isEmailValid) {
      setEmailTouched(true);
      validateEmail(trimmedEmail);
      setErrorMessage(null);
      setStatusMessage(null);
      return;
    }

    if (trimmedPhone) {
      const parsed = parsePhoneInput(trimmedPhone);
      if (!parsed?.isValid()) {
        setPhoneTouched(true);
        setPhoneError(t('auth.signup.phoneInvalidDescription'));
        setErrorMessage(null);
        setStatusMessage(null);
        return;
      }
      setPhoneError(null);
    }

    if (!isFormValid) {
      setErrorMessage(t('auth.signup.missingDescription'));
      setStatusMessage(null);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('auth.signup.passwordMismatchDescription'));
      setStatusMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);
    const normalizedPhone = normalizePhoneNumber(trimmedPhone);
    const metadata = {
      fullName: trimmedName,
      phoneNumber: normalizedPhone || undefined,
    };
    const result = await signUpWithEmail(trimmedEmail, password, metadata);
    setIsSubmitting(false);

    if (result.success) {
      setStatusMessage(t('auth.signup.checkEmailDescription'));
      router.replace('/(auth)/login');
    } else {
      const { friendly } = showFriendlyError(
        result.friendlyError ?? result.error ?? t('auth.signup.errorUnknown'),
        { surface: 'auth.signup.email' },
      );
      const friendlyMessage =
        friendly?.description ??
        (friendly?.descriptionKey ? t(friendly.descriptionKey) : undefined) ??
        friendly?.title ??
        (friendly?.titleKey ? t(friendly.titleKey) : undefined) ??
        result.error?.toString() ??
        t('auth.signup.errorUnknown');
      setErrorMessage(friendlyMessage);
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

            {statusMessage ? (
              <CaptionText color="$accentColor" textAlign="center">
                {statusMessage}
              </CaptionText>
            ) : null}

            <Form width="100%" gap="$4">
              <FormField
                ref={nameInputRef}
                testID="name-field"
                inputTestID="name-input"
                label={t('auth.signup.nameLabel')}
                placeholder={t('auth.signup.namePlaceholder')}
                placeholderTextColor="$colorMuted"
                autoCapitalize="words"
                value={name}
                required
                onChangeText={setName}
                onSubmitEditing={() => emailInputRef.current?.focus?.()}
                returnKeyType="next"
              />

              <FormField
                ref={emailInputRef}
                testID="email-field"
                inputTestID="email-input"
                label={t('auth.emailLabel')}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor="$colorMuted"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                required
                errorText={emailTouched ? (emailError ?? undefined) : undefined}
                borderColor={emailTouched && emailError ? '$dangerColor' : undefined}
                borderColorHover={emailTouched && emailError ? '$dangerColor' : undefined}
                borderColorPress={emailTouched && emailError ? '$dangerColor' : undefined}
                focusStyle={
                  emailTouched && emailError ? { borderColor: '$dangerColor' } : undefined
                }
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailTouched) {
                    validateEmail(value);
                  }
                }}
                onBlur={() => {
                  setEmailTouched(true);
                  validateEmail(email);
                }}
                onSubmitEditing={() => phoneInputRef.current?.focus?.()}
                returnKeyType="next"
              />

              <FormField
                ref={phoneInputRef}
                testID="phone-field"
                inputTestID="phone-input"
                label={t('auth.signup.phoneLabel')}
                placeholder={t('auth.signup.phonePlaceholder')}
                placeholderTextColor="$colorMuted"
                keyboardType="phone-pad"
                autoCapitalize="none"
                value={phoneNumber}
                errorText={phoneTouched ? (phoneError ?? undefined) : undefined}
                borderColor={phoneTouched && phoneError ? '$dangerColor' : undefined}
                borderColorHover={phoneTouched && phoneError ? '$dangerColor' : undefined}
                borderColorPress={phoneTouched && phoneError ? '$dangerColor' : undefined}
                focusStyle={
                  phoneTouched && phoneError ? { borderColor: '$dangerColor' } : undefined
                }
                onChangeText={(value) => {
                  handlePhoneChange(value);
                  if (phoneTouched) {
                    const parsed = parsePhoneInput(value);
                    if (!parsed) {
                      setPhoneError(null);
                      return;
                    }
                    setPhoneError(
                      parsed.isValid() ? null : t('auth.signup.phoneInvalidDescription'),
                    );
                  }
                }}
                onBlur={() => {
                  setPhoneTouched(true);
                  const parsed = parsePhoneInput(phoneNumber);
                  if (!parsed) {
                    setPhoneError(null);
                    return;
                  }
                  setPhoneError(parsed.isValid() ? null : t('auth.signup.phoneInvalidDescription'));
                }}
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
                required
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
                required
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

              <InlineError message={errorMessage} testID="signup-error" />

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
    </>
  );
}
