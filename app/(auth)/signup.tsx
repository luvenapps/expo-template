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

  const isFormValid = useMemo(() => {
    return email.trim() !== '' && password.trim().length >= 8 && confirmPassword.trim().length >= 8;
  }, [email, password, confirmPassword]);

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.show({
        type: 'error',
        title: 'Missing information',
        description: 'Enter a valid email and password.',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.show({
        type: 'error',
        title: 'Passwords do not match',
        description: 'Make sure both password fields match.',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await signUpWithEmail(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      toast.show({
        type: 'success',
        title: 'Check your email',
        description: 'Confirm your email to finish creating your account.',
      });
      router.replace('/(auth)/login');
    } else {
      showFriendlyError(result.friendlyError ?? result.error ?? 'Unable to sign up', {
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
              <TitleText textAlign="center">Create your account</TitleText>
              <SubtitleText textAlign="center">Sign up to sync habits across devices</SubtitleText>
            </YStack>

            <Form onSubmit={handleSubmit} width="100%" gap="$4">
              <FormField
                label="Email"
                placeholder="you@example.com"
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
                label="Password"
                placeholder="At least 8 characters"
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
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                label="Confirm password"
                placeholder="Re-enter your password"
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
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                <PrimaryButton disabled={!isFormValid || isSubmitting} onPress={handleSubmit}>
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </PrimaryButton>
              </Form.Trigger>
            </Form>

            <YStack
              width="100%"
              alignItems="center"
              gap="$2"
              marginTop={Platform.OS === 'web' ? 0 : '$5'}
            >
              <CaptionText color="$colorMuted">Already have an account?</CaptionText>
              <PrimaryButton width="100%" onPress={() => router.replace('/(auth)/login')}>
                Sign in
              </PrimaryButton>
            </YStack>
          </YStack>
        </Card>
      </ScreenContainer>
      <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />
    </>
  );
}
