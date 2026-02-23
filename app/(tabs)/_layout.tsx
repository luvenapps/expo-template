import { useSessionStore } from '@/auth/session';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { Home, Settings } from '@tamagui/lucide-icons';
import { Redirect, router, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

function TabIcon({ color, Icon }: { color: string; Icon: typeof Home }) {
  return <Icon size={22} color={color} />;
}

export default function TabsLayout() {
  const { palette } = useThemeContext();
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);
  const settingsHref = Platform.OS === 'web' ? '/settings' : undefined;
  const settingsTabListeners =
    Platform.OS === 'web'
      ? {
          tabPress: (event: { preventDefault: () => void }) => {
            event.preventDefault();
            router.replace('/settings');
          },
        }
      : undefined;

  if (Platform.OS === 'web' && status === 'unknown') {
    return null;
  }

  // Force login in Web
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
        listeners={settingsTabListeners}
        options={{
          title: t('common.settings'),
          href: settingsHref,
          tabBarIcon: ({ color }) => <TabIcon color={color} Icon={Settings} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
