import { useSessionStore } from '@/auth/session';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { Home, Settings } from '@tamagui/lucide-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

function TabIcon({ color, Icon }: { color: string; Icon: typeof Home }) {
  return <Icon size={22} color={color} />;
}

export default function TabsLayout() {
  const { palette } = useThemeContext();
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);

  if (Platform.OS === 'web' && status === 'unknown') {
    return null;
  }

  if (Platform.OS === 'web' && status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.accentMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabIcon color={color} Icon={Home} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('common.settings'),
          tabBarIcon: ({ color }) => <TabIcon color={color} Icon={Settings} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
