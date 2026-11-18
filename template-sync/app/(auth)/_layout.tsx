import { HeaderBackButton } from '@react-navigation/elements';
import { useSessionStore } from '@/auth/session';
import { useOptionalThemeContext } from '@/ui/theme/ThemeProvider';
import { Redirect, Stack, usePathname, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function AuthLayout() {
  const router = useRouter();
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);
  const pathname = usePathname();
  const palette = useOptionalThemeContext()?.palette;
  const homeHref = Platform.OS === 'web' ? '/' : '/(tabs)';
  const shouldRedirectToHome =
    Platform.OS === 'web' && status === 'authenticated' && pathname !== '/auth-callback';

  if (Platform.OS === 'web' && status === 'unknown') {
    return null;
  }

  if (shouldRedirectToHome) {
    return <Redirect href={homeHref} />;
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(homeHref);
    }
  };

  return (
    <Stack
      screenOptions={{
        ...(palette
          ? {
              headerStyle: { backgroundColor: palette.background },
              headerTintColor: palette.text,
              headerTitleStyle: { color: palette.text },
            }
          : {}),
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerLeft: () => <HeaderBackButton label="" tintColor={palette?.text} onPress={goBack} />,
      }}
    >
      <Stack.Screen name="login" options={{ title: t('auth.header.signIn') }} />
      <Stack.Screen name="signup" options={{ title: t('auth.header.createAccount') }} />
      <Stack.Screen name="forgot-password" options={{ title: t('auth.header.resetPassword') }} />
      <Stack.Screen name="auth-callback" options={{ title: '', headerLeft: undefined }} />
    </Stack>
  );
}
