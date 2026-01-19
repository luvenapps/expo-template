/* istanbul ignore file */
import { HeaderBackButton } from '@react-navigation/elements';
import { useSessionStore } from '@/auth/session';
import { Redirect, Stack, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);

  if (Platform.OS === 'web' && status === 'unknown') {
    return null;
  }

  if (Platform.OS === 'web' && status === 'authenticated') {
    return <Redirect href="/(tabs)" />;
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerLeft: (props) => <HeaderBackButton {...props} label="" onPress={goBack} />,
      }}
    >
      <Stack.Screen name="login" options={{ title: t('auth.header.signIn') }} />
      <Stack.Screen name="signup" options={{ title: t('auth.header.createAccount') }} />
      <Stack.Screen name="forgot-password" options={{ title: t('auth.header.resetPassword') }} />
      <Stack.Screen name="auth-callback" options={{ title: '', headerLeft: undefined }} />
    </Stack>
  );
}
