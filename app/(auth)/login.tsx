import { useSessionStore } from '@/auth/session';
import { isValidEmail } from '@/data/validation';
import {
  BodyText,
  CaptionText,
  FormField,
  PrimaryButton,
  ScreenContainer,
  SubtitleText,
  TitleText,
} from '@/ui';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { Button, Card, Form, View, YStack } from 'tamagui';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const signInWithEmail = useSessionStore((state) => state.signInWithEmail);
  const setError = useSessionStore((state) => state.setError);
  const isLoading = useSessionStore((state) => state.isLoading);
  const error = useSessionStore((state) => state.error);

  const isFormValid = email.trim() !== '' && isValidEmail(email) && password.trim() !== '';

  // Clear form fields and error when returning to the screen
  useFocusEffect(
    useCallback(() => {
      // This runs when the screen gains focus (user navigates to it)
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setError(null);
    }, [setError]),
  );

  const handleSubmit = async () => {
    // Prevent submission if form is invalid
    if (!isFormValid) return;

    const result = await signInWithEmail(email, password);
    if (result.success) {
      // Clear fields and error on successful login
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setError(null);

      if (navigation.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  return (
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
            <TitleText textAlign="center">Welcome back</TitleText>
            <SubtitleText textAlign="center">Sign in to your account to continue</SubtitleText>
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
              placeholder="Enter your password"
              placeholderTextColor="$colorMuted"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              paddingRight="$10"
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

            <CaptionText
              textAlign="right"
              color="$accentColor"
              fontWeight="600"
              hoverStyle={{ opacity: 0.8, cursor: 'pointer' }}
            >
              Forgot your password?
            </CaptionText>

            {error ? (
              <YStack
                padding="$3"
                backgroundColor="$backgroundPress"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <BodyText color="red" textAlign="center" fontSize="$3">
                  {error}
                </BodyText>
              </YStack>
            ) : null}

            <Form.Trigger asChild>
              <PrimaryButton disabled={!isFormValid || isLoading} onPress={handleSubmit}>
                {isLoading ? 'Signing in…' : 'Sign In'}
              </PrimaryButton>
            </Form.Trigger>
          </Form>

          <YStack gap="$3" width="100%" alignItems="center">
            <View marginTop={10}>
              <CaptionText color="$colorMuted">Or</CaptionText>
            </View>
            <Button flex={1} width="100%" height={48} variant="outlined" disabled>
              Continue with Apple
            </Button>
            <Button flex={1} width="100%" height={48} variant="outlined" disabled>
              Continue with Google
            </Button>
          </YStack>
        </YStack>
      </Card>
    </ScreenContainer>
  );
}
