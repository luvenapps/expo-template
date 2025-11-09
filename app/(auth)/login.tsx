import { useSessionStore } from '@/auth/session';
import { PrimaryButton, ScreenContainer } from '@/ui';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Form, H1, Input, Paragraph, Text, View, XStack, YStack } from 'tamagui';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const signInWithEmail = useSessionStore((state) => state.signInWithEmail);
  const isLoading = useSessionStore((state) => state.isLoading);
  const error = useSessionStore((state) => state.error);

  const handleSubmit = async () => {
    const result = await signInWithEmail(email, password);
    if (result.success) {
      if (navigation.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  return (
    <ScreenContainer keyboardAvoiding justifyContent="center" alignItems="center">
      <Card bordered elevate padding="$6" width="100%" maxWidth={440}>
        <YStack gap="$5" width="100%">
          <H1 fontSize={28} fontWeight="700" color="$color" textAlign="center">
            Sign in to your account
          </H1>

          <Form onSubmit={handleSubmit} width="100%">
            <Text fontWeight="600" color="$color">
              Email
            </Text>

            <Input
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              size="$2"
              width="100%"
              borderColor="$borderColor"
              backgroundColor="$background"
              borderWidth={1}
              borderRadius={8}
              padding={12}
            />

            <Text fontWeight="600" color="$color">
              Password
            </Text>
            <View
              position="relative"
              alignItems="center"
              borderWidth={1}
              borderColor="#CBD5F5"
              borderRadius={8}
            >
              <Input
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                size="$2"
                width="100%"
                borderColor="$borderColor"
                backgroundColor="$background"
                borderWidth={1}
                borderRadius={8}
                padding={12}
              />
              <View
                position="absolute"
                right={12}
                padding={4}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onPress={() => setShowPassword(!showPassword)}
                hoverStyle={{ opacity: 0.8, cursor: 'pointer' }}
                pressStyle={{ opacity: 0.5 }}
                role="button"
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </View>
            </View>
            <Text textAlign="right" color="$accentColor" fontWeight="600">
              Forgot your password?
            </Text>

            {error ? (
              <Paragraph color="$colorMuted" textAlign="center">
                {error}
              </Paragraph>
            ) : null}

            <Form.Trigger asChild>
              <PrimaryButton disabled={!email || !password || isLoading} onPress={handleSubmit}>
                {isLoading ? 'Signing in…' : 'Sign In'}
              </PrimaryButton>
            </Form.Trigger>
          </Form>

          <YStack gap="$3" width="100%" alignItems="center">
            <XStack width="100%" alignItems="center" gap="$3">
              <YStack flex={1} height={1} backgroundColor="$borderColor" />
              <Paragraph color="$colorMuted">Or</Paragraph>
              <YStack flex={1} height={1} backgroundColor="$borderColor" />
            </XStack>
            <XStack gap="$3" width="100%" flexWrap="wrap">
              <Button flex={1} variant="outlined" disabled>
                Continue with Apple
              </Button>
              <Button flex={1} variant="outlined" disabled>
                Continue with Google
              </Button>
            </XStack>
          </YStack>
        </YStack>
      </Card>
    </ScreenContainer>
  );
}
