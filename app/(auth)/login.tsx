import { useSessionStore } from '@/auth/session';
import { PrimaryButton, ScreenContainer } from '@/ui';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput } from 'react-native';
import { Paragraph, YStack } from 'tamagui';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <ScreenContainer justifyContent="center" alignItems="center" gap="$4">
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
        <PrimaryButton disabled={!email || !password || isLoading} onPress={handleSubmit}>
          {isLoading ? 'Signing in…' : 'Sign In'}
        </PrimaryButton>
      </YStack>
    </ScreenContainer>
  );
}
