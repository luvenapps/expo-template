/* istanbul ignore file */
import { HeaderBackButton } from '@react-navigation/elements';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
  const router = useRouter();
  const { t } = useTranslation();

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
