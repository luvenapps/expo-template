import { Home, Settings } from '@tamagui/lucide-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

function TabIcon({ color, Icon }: { color: string; Icon: typeof Home }) {
  return <Icon size={22} color={color} />;
}

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#60A5FA' : '#2563EB',
        tabBarInactiveTintColor: isDark ? '#94A3B8' : '#94A3B8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
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
