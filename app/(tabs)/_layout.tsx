import { Home, Settings } from '@tamagui/lucide-icons';
import { Tabs } from 'expo-router';

import { DOMAIN } from '@/config/domain.config';
import { useThemeContext } from '@/ui/theme/ThemeProvider';

function TabIcon({ color, Icon }: { color: string; Icon: typeof Home }) {
  return <Icon size={22} color={color} />;
}

export default function TabsLayout() {
  const { resolvedTheme, palette } = useThemeContext();
  const isDark = resolvedTheme === 'dark';
  const activeColor = palette.accent;
  const inactiveColor = palette.accentMuted;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: DOMAIN.app.displayName,
          tabBarIcon: ({ color }) => <TabIcon color={color} Icon={Home} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon color={color} Icon={Settings} />,
        }}
      />
    </Tabs>
  );
}
