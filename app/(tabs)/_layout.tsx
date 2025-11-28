import { DOMAIN } from '@/config/domain.config';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { Home, Settings } from '@tamagui/lucide-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

function TabIcon({ color, Icon }: { color: string; Icon: typeof Home }) {
  return <Icon size={22} color={color} />;
}

export default function TabsLayout() {
  const { palette } = useThemeContext();
  const { t } = useTranslation();

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
          title: t('tabs.home', { app: DOMAIN.app.displayName }),
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
