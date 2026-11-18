jest.mock('@/ui/icons', () => {
  const React = jest.requireActual('react');
  return {
    Home: (props: object) => React.createElement('View', { ...props, testID: 'home-icon' }),
    Settings: (props: object) => React.createElement('View', { ...props, testID: 'settings-icon' }),
  };
});

import { findAllByType, findByType } from '../../helpers/testInstance';

// Mock expo-router
const mockSessionStatus = jest.fn(() => 'authenticated');

jest.mock('@/auth/session', () => ({
  useSessionStore: (selector: (state: { status: string }) => unknown) =>
    selector({ status: mockSessionStatus() }),
}));

jest.mock('expo-router', () => {
  const mockReact = jest.requireActual('react');
  const router = {
    replace: jest.fn(),
  };

  const Tabs = ({ children, screenOptions }: any) => {
    return mockReact.createElement('Tabs', { testID: 'tabs', screenOptions }, children);
  };

  const Screen = ({ name, options, listeners }: any) => {
    return mockReact.createElement('TabsScreen', {
      testID: `tabs-screen-${name}`,
      name,
      options,
      listeners,
    });
  };

  Tabs.Screen = Screen;

  const Redirect = ({ href }: { href: string }) => mockReact.createElement('Redirect', { href });

  return { Tabs, Redirect, router };
});

// Mock ThemeProvider
jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: jest.fn(),
  useOptionalThemeContext: jest.fn(),
}));

import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import TabsLayout from '../../../app/(tabs)/_layout';

const mockUseThemeContext = useThemeContext as jest.Mock;

describe('TabsLayout', () => {
  const originalPlatform = Platform.OS;
  const mockRouterReplace = router.replace as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    mockSessionStatus.mockReturnValue('authenticated');
    mockUseThemeContext.mockReturnValue({
      resolvedTheme: 'light',
      palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  describe('Theme Colors', () => {
    it('should use dark theme colors when theme is dark', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'dark',
        palette: {
          background: '#0A0B0D',
          text: '#F5F5F5',
          accent: '#60A5FA',
          accentMuted: '#94A3B8',
        },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const tabs = findByType(rootValue!, 'Tabs');

      expect(tabs.props.screenOptions.tabBarActiveTintColor).toBe('#60A5FA');
      expect(tabs.props.screenOptions.tabBarInactiveTintColor).toBe('#94A3B8');
      expect(tabs.props.screenOptions.headerStyle).toEqual({ backgroundColor: '#0A0B0D' });
      expect(tabs.props.screenOptions.headerTintColor).toBe('#F5F5F5');
      expect(tabs.props.screenOptions.headerTitleStyle).toEqual({ color: '#F5F5F5' });
      expect(tabs.props.screenOptions.tabBarStyle).toEqual({
        backgroundColor: '#0A0B0D',
        borderTopColor: '#0A0B0D',
      });
    });

    it('should use light theme colors when theme is light', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const tabs = findByType(rootValue!, 'Tabs');

      expect(tabs.props.screenOptions.tabBarActiveTintColor).toBe('#2563EB');
      expect(tabs.props.screenOptions.tabBarInactiveTintColor).toBe('#94A3B8');
    });
  });

  describe('Screen Options', () => {
    it('should not set headerShown in screenOptions', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const tabs = findByType(rootValue!, 'Tabs');

      // headerShown is not set in screenOptions anymore
      expect(tabs.props.screenOptions.headerShown).toBeUndefined();
    });
  });

  describe('Tab Screens', () => {
    it('should render index screen with correct configuration', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');
      const indexScreen = screens.find((s: any) => s.props.name === 'index')!;

      expect(indexScreen).toBeDefined();
      expect(indexScreen.props.options.title).toBe('tabs.home');
      expect(indexScreen.props.options.tabBarIcon).toBeDefined();
    });

    it('should render settings screen with correct configuration', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings')!;

      expect(settingsScreen).toBeDefined();
      expect(settingsScreen.props.options.title).toBe('common.settings');
      expect(settingsScreen.props.options.tabBarIcon).toBeDefined();
    });

    it('should render exactly 2 tab screens', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');

      expect(screens).toHaveLength(2);
    });
  });

  describe('Tab Icons', () => {
    it('should render Home icon for index screen with correct props', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');
      const indexScreen = screens.find((s: any) => s.props.name === 'index')!;

      const iconElement = indexScreen.props.options.tabBarIcon({ color: '#2563EB' });
      const rendered = await render(iconElement);
      const icon = rendered.getByTestId('home-icon');

      expect(icon.props.size).toBe(22);
      expect(icon.props.color).toBe('#2563EB');
    });

    it('should render Settings icon for settings screen with correct props', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings')!;

      const iconElement = settingsScreen.props.options.tabBarIcon({ color: '#94A3B8' });
      const rendered = await render(iconElement);
      const icon = rendered.getByTestId('settings-icon');

      expect(icon.props.size).toBe(22);
      expect(icon.props.color).toBe('#94A3B8');
    });

    it('should pass different colors to tab icons correctly', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'dark',
        palette: { accent: '#60A5FA', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');
      const indexScreen = screens.find((s: any) => s.props.name === 'index')!;

      const activeIcon = indexScreen.props.options.tabBarIcon({ color: '#60A5FA' });
      const inactiveIcon = indexScreen.props.options.tabBarIcon({ color: '#94A3B8' });

      const activeRendered = await render(activeIcon);
      const inactiveRendered = await render(inactiveIcon);

      expect(activeRendered.getByTestId('home-icon').props.color).toBe('#60A5FA');
      expect(inactiveRendered.getByTestId('home-icon').props.color).toBe('#94A3B8');
    });
  });

  describe('Integration', () => {
    it('should render complete component structure', async () => {
      mockUseThemeContext.mockReturnValue({
        resolvedTheme: 'light',
        palette: { accent: '#2563EB', accentMuted: '#94A3B8' },
      });

      const { root: rootValue } = await render(<TabsLayout />);

      // Check Tabs component exists
      const tabs = findByType(rootValue!, 'Tabs');
      expect(tabs).toBeDefined();

      // Check all screens exist
      const screens = findAllByType(rootValue!, 'TabsScreen');
      expect(screens).toHaveLength(2);

      // Check screen names
      const screenNames = screens.map((s: any) => s.props.name);
      expect(screenNames).toContain('index');
      expect(screenNames).toContain('settings');
    });
  });

  describe('Web Guard', () => {
    it('returns null on web while session is unknown', async () => {
      mockSessionStatus.mockReturnValue('unknown');
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const result = await render(<TabsLayout />);
      expect(result.toJSON()).toBeNull();
    });

    it('redirects unauthenticated web users to login', async () => {
      mockSessionStatus.mockReturnValue('unauthenticated');
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const { root: rootValue } = await render(<TabsLayout />);
      const redirect = findByType(rootValue!, 'Redirect');

      expect(redirect.props.href).toBe('/(auth)/login');
    });

    it('intercepts settings tab press on web and routes to /settings', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings')!;
      const preventDefault = jest.fn();

      settingsScreen.props.listeners.tabPress({ preventDefault });

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith('/settings');
      expect(settingsScreen.props.options.href).toBe('/settings');
    });

    it('does not set web listeners or href on native settings tab', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

      const { root: rootValue } = await render(<TabsLayout />);
      const screens = findAllByType(rootValue!, 'TabsScreen');
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings')!;

      expect(settingsScreen.props.listeners).toBeUndefined();
      expect(settingsScreen.props.options.href).toBeUndefined();
    });
  });
});
