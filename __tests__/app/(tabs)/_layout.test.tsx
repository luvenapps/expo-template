// Mock expo-router
jest.mock('expo-router', () => {
  const mockReact = jest.requireActual('react');

  const Tabs = ({ children, screenOptions }: any) => {
    return mockReact.createElement('Tabs', { testID: 'tabs', screenOptions }, children);
  };

  const Screen = ({ name, options }: any) => {
    return mockReact.createElement('TabsScreen', {
      testID: `tabs-screen-${name}`,
      name,
      options,
    });
  };

  Tabs.Screen = Screen;

  return { Tabs };
});

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: jest.fn(),
}));

import { DOMAIN } from '@/config/domain.config';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { render } from '@testing-library/react-native';
import TabsLayout from '../../../app/(tabs)/_layout';

const mockUseThemeContext = useThemeContext as jest.Mock;

describe('TabsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeContext.mockReturnValue({
      resolvedTheme: 'light',
      palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
    });
  });

  describe('Theme Colors', () => {
    it('should use dark theme colors when theme is dark', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'dark',
        palette: { accent: '#60A5FA', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const tabs = UNSAFE_root.findByType('Tabs' as any);

      expect(tabs.props.screenOptions.tabBarActiveTintColor).toBe('#60A5FA');
      expect(tabs.props.screenOptions.tabBarInactiveTintColor).toBe('#94A3B8');
    });

    it('should use light theme colors when theme is light', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const tabs = UNSAFE_root.findByType('Tabs' as any);

      expect(tabs.props.screenOptions.tabBarActiveTintColor).toBe('#2563EB');
      expect(tabs.props.screenOptions.tabBarInactiveTintColor).toBe('#94A3B8');
    });
  });

  describe('Screen Options', () => {
    it('should not set headerShown in screenOptions', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const tabs = UNSAFE_root.findByType('Tabs' as any);

      // headerShown is not set in screenOptions anymore
      expect(tabs.props.screenOptions.headerShown).toBeUndefined();
    });
  });

  describe('Tab Screens', () => {
    it('should render index screen with correct configuration', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const indexScreen = screens.find((s: any) => s.props.name === 'index');

      expect(indexScreen).toBeDefined();
      expect(indexScreen.props.options.title).toBe(DOMAIN.app.displayName);
      expect(indexScreen.props.options.tabBarIcon).toBeDefined();
    });

    it('should render settings screen with correct configuration', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings');

      expect(settingsScreen).toBeDefined();
      expect(settingsScreen.props.options.title).toBe('Settings');
      expect(settingsScreen.props.options.tabBarIcon).toBeDefined();
    });

    it('should render exactly 2 tab screens', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);

      expect(screens).toHaveLength(2);
    });
  });

  describe('Tab Icons', () => {
    it('should render Home icon for index screen with correct props', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const indexScreen = screens.find((s: any) => s.props.name === 'index');

      const iconElement = indexScreen.props.options.tabBarIcon({ color: '#2563EB' });
      const rendered = render(iconElement);
      const icon = rendered.getByTestId('home-icon');

      expect(icon.props.size).toBe(22);
      expect(icon.props.color).toBe('#2563EB');
    });

    it('should render Settings icon for settings screen with correct props', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings');

      const iconElement = settingsScreen.props.options.tabBarIcon({ color: '#94A3B8' });
      const rendered = render(iconElement);
      const icon = rendered.getByTestId('settings-icon');

      expect(icon.props.size).toBe(22);
      expect(icon.props.color).toBe('#94A3B8');
    });

    it('should pass different colors to tab icons correctly', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'dark',
        palette: { accent: '#60A5FA', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const indexScreen = screens.find((s: any) => s.props.name === 'index');

      const activeIcon = indexScreen.props.options.tabBarIcon({ color: '#60A5FA' });
      const inactiveIcon = indexScreen.props.options.tabBarIcon({ color: '#94A3B8' });

      const activeRendered = render(activeIcon);
      const inactiveRendered = render(inactiveIcon);

      expect(activeRendered.getByTestId('home-icon').props.color).toBe('#60A5FA');
      expect(inactiveRendered.getByTestId('home-icon').props.color).toBe('#94A3B8');
    });
  });

  describe('Integration', () => {
    it('should render complete component structure', () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { UNSAFE_root } = render(<TabsLayout />);

      // Check Tabs component exists
      const tabs = UNSAFE_root.findByType('Tabs' as any);
      expect(tabs).toBeDefined();

      // Check all screens exist
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      expect(screens).toHaveLength(2);

      // Check screen names
      const screenNames = screens.map((s: any) => s.props.name);
      expect(screenNames).toContain('index');
      expect(screenNames).toContain('settings');
    });
  });
});
