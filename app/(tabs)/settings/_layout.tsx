import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function SettingsLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('common.settings'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="database"
        options={{
          title: 'Database Viewer',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          title: t('settings.accountTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="appearance"
        options={{
          title: t('settings.themeTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="language"
        options={{
          title: t('settings.languageTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: t('settings.notificationsTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="get-help"
        options={{
          title: t('settings.getHelpTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          title: t('settings.termsTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: t('settings.privacyTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="developer-utilities"
        options={{
          title: t('settings.developerUtilitiesTitle'),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
