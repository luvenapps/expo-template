import { useSessionStore } from '@/auth/session';
import { PrimaryButton, ScreenContainer } from '@/ui';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Paragraph, XStack, YStack } from 'tamagui';
import { Eye, EyeOff } from '@tamagui/lucide-icons';

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
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack width="100%" maxWidth={400} gap="$3">
            <TextInput
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              style={{ borderWidth: 1, borderColor: '#CBD5F5', borderRadius: 8, padding: 12 }}
            />
            <XStack
              position="relative"
              alignItems="center"
              borderWidth={1}
              borderColor="#CBD5F5"
              borderRadius={8}
            >
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                style={{ flex: 1, padding: 12, paddingRight: 48 }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  padding: 4,
                }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#6B7280" />
                ) : (
                  <Eye size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </XStack>
            {error ? (
              <Paragraph color="$colorMuted" textAlign="center">
                {error}
              </Paragraph>
            ) : null}
            <PrimaryButton disabled={!email || !password || isLoading} onPress={handleSubmit}>
              {isLoading ? 'Signing in…' : 'Sign In'}
            </PrimaryButton>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
