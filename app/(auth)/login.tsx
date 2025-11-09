import { useSessionStore } from '@/auth/session';
import { PrimaryButton, ScreenContainer } from '@/ui';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Button, Card, Form, H1, Input, Paragraph, Text, View, YStack } from 'tamagui';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const signInWithEmail = useSessionStore((state) => state.signInWithEmail);
  const setError = useSessionStore((state) => state.setError);
  const isLoading = useSessionStore((state) => state.isLoading);
  const error = useSessionStore((state) => state.error);

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
            <H1 fontSize={32} fontWeight="700" color="$color" textAlign="center">
              Welcome back
            </H1>
            <Paragraph color="$colorMuted" textAlign="center" fontSize="$3">
              Sign in to your account to continue
            </Paragraph>
          </YStack>

          <Form onSubmit={handleSubmit} width="100%" gap="$4">
            <YStack gap="$2">
              <Text fontWeight="600" color="$color" fontSize="$4">
                Email
              </Text>
              <Input
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                size="$2"
                height={56}
                width="100%"
                borderColor="$borderColor"
                backgroundColor="$background"
                borderWidth={1}
                borderRadius="$3"
                focusStyle={{
                  borderColor: '$borderColorFocus',
                  borderWidth: 2,
                }}
              />
            </YStack>

            <YStack gap="$2">
              <Text fontWeight="600" color="$color" fontSize="$4">
                Password
              </Text>
              <View position="relative" width="100%">
                <Input
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  size="$2"
                  height={56}
                  width="100%"
                  borderColor="$borderColor"
                  backgroundColor="$background"
                  borderWidth={1}
                  borderRadius="$3"
                  paddingRight="$10"
                  focusStyle={{
                    borderColor: '$borderColorFocus',
                    borderWidth: 2,
                  }}
                />
                <View
                  position="absolute"
                  right="$3"
                  top="50%"
                  y={-12}
                  padding="$1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword(!showPassword)}
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
              </View>
            </YStack>

            <Text
              textAlign="right"
              color="$accentColor"
              fontWeight="600"
              fontSize="$4"
              hoverStyle={{ opacity: 0.8, cursor: 'pointer' }}
            >
              Forgot your password?
            </Text>

            {error ? (
              <YStack
                padding="$3"
                backgroundColor="$backgroundPress"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <Paragraph color="red" textAlign="center" fontSize="$3">
                  {error}
                </Paragraph>
              </YStack>
            ) : null}

            <Form.Trigger asChild>
              <PrimaryButton disabled={!email || !password || isLoading} onPress={handleSubmit}>
                {isLoading ? 'Signing in…' : 'Sign In'}
              </PrimaryButton>
            </Form.Trigger>
          </Form>

          <YStack gap="$3" width="100%" alignItems="center">
            <View marginTop={10}>
              <Text color="$colorMuted">Or</Text>
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
