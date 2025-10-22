import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, Paragraph, YStack } from 'tamagui';
import { TextInput } from 'react-native';
import { useSessionStore } from '@/auth/session';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signInWithEmail = useSessionStore((state) => state.signInWithEmail);
  const isLoading = useSessionStore((state) => state.isLoading);
  const error = useSessionStore((state) => state.error);

  const handleSubmit = async () => {
    const result = await signInWithEmail(email, password);
    if (result.success) {
      // Navigate back to previous screen after successful login
      router.back();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Sign in', headerShown: true }} />
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" paddingHorizontal="$6">
        <YStack width="100%" gap="$3">
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={{ borderWidth: 1, borderColor: '#CBD5F5', borderRadius: 8, padding: 12 }}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={{ borderWidth: 1, borderColor: '#CBD5F5', borderRadius: 8, padding: 12 }}
          />
          {error ? (
            <Paragraph color="$colorMuted" textAlign="center">
              {error}
            </Paragraph>
          ) : null}
          <Button size="$4" disabled={!email || !password || isLoading} onPress={handleSubmit}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
