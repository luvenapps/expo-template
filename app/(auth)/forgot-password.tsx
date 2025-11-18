import { sendPasswordReset } from '@/auth/service';
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
import { useState } from 'react';
import { Platform } from 'react-native';
import { Card, Form, YStack } from 'tamagui';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const showFriendlyError = useFriendlyErrorHandler(toast);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.show({
        type: 'error',
        title: 'Enter your email',
        description: 'We need it to send a reset link.',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await sendPasswordReset(email.trim());
    setIsSubmitting(false);

    if (result.success) {
      toast.show({
        type: 'success',
        title: 'Reset link sent',
        description: 'Check your email for instructions to reset your password.',
      });
      router.replace('/(auth)/login');
    } else {
      showFriendlyError(result.friendlyError ?? result.error ?? 'Unable to send reset email', {
        surface: 'auth.password.reset',
      });
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
              <TitleText textAlign="center">Reset your password</TitleText>
              <SubtitleText textAlign="center">
                Enter the email associated with your account
              </SubtitleText>
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
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
              />

              <Form.Trigger asChild>
                <PrimaryButton disabled={!email.trim() || isSubmitting} onPress={handleSubmit}>
                  {isSubmitting ? 'Sending…' : 'Send reset link'}
                </PrimaryButton>
              </Form.Trigger>
            </Form>

            <YStack
              width="100%"
              alignItems="center"
              gap="$2"
              marginTop={Platform.OS === 'web' ? 0 : '$5'}
            >
              <CaptionText color="$colorMuted">Remembered your password?</CaptionText>
              <PrimaryButton width="100%" onPress={() => router.replace('/(auth)/login')}>
                Back to sign in
              </PrimaryButton>
            </YStack>
          </YStack>
        </Card>
      </ScreenContainer>
      <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />
    </>
  );
}
