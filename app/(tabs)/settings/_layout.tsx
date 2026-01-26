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
        name="profile"
        options={{
          title: 'Profile',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
