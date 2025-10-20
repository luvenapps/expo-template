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

import { render } from '@testing-library/react-native';
import React from 'react';
import * as RN from 'react-native';
import TabsLayout from '../../../app/(tabs)/_layout';

describe('TabsLayout', () => {
  let useColorSchemeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    useColorSchemeSpy = jest.spyOn(RN, 'useColorScheme');
  });

  afterEach(() => {
    useColorSchemeSpy.mockRestore();
  });

  describe('Theme Colors', () => {
    it('should use dark theme colors when colorScheme is dark', () => {
      useColorSchemeSpy.mockReturnValue('dark');

      const { UNSAFE_root } = render(<TabsLayout />);
      const tabs = UNSAFE_root.findByType('Tabs' as any);

      expect(tabs.props.screenOptions.tabBarActiveTintColor).toBe('#60A5FA');
      expect(tabs.props.screenOptions.tabBarInactiveTintColor).toBe('#94A3B8');
    });

    it('should use light theme colors when colorScheme is light', () => {
      useColorSchemeSpy.mockReturnValue('light');

      const { UNSAFE_root } = render(<TabsLayout />);
      const tabs = UNSAFE_root.findByType('Tabs' as any);

      expect(tabs.props.screenOptions.tabBarActiveTintColor).toBe('#2563EB');
      expect(tabs.props.screenOptions.tabBarInactiveTintColor).toBe('#94A3B8');
    });

    it('should use light theme colors when colorScheme is null', () => {
      useColorSchemeSpy.mockReturnValue(null);

      const { UNSAFE_root } = render(<TabsLayout />);
      const tabs = UNSAFE_root.findByType('Tabs' as any);

      expect(tabs.props.screenOptions.tabBarActiveTintColor).toBe('#2563EB');
      expect(tabs.props.screenOptions.tabBarInactiveTintColor).toBe('#94A3B8');
    });
  });

  describe('Screen Options', () => {
    it('should hide header by default', () => {
      useColorSchemeSpy.mockReturnValue('light');

      const { UNSAFE_root } = render(<TabsLayout />);
      const tabs = UNSAFE_root.findByType('Tabs' as any);

      expect(tabs.props.screenOptions.headerShown).toBe(false);
    });
  });

  describe('Tab Screens', () => {
    it('should render index screen with correct configuration', () => {
      useColorSchemeSpy.mockReturnValue('light');

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const indexScreen = screens.find((s: any) => s.props.name === 'index');

      expect(indexScreen).toBeDefined();
      expect(indexScreen.props.options.title).toBe('Today');
      expect(indexScreen.props.options.tabBarIcon).toBeDefined();
    });

    it('should render settings screen with correct configuration', () => {
      useColorSchemeSpy.mockReturnValue('light');

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings/index');

      expect(settingsScreen).toBeDefined();
      expect(settingsScreen.props.options.title).toBe('Settings');
      expect(settingsScreen.props.options.tabBarIcon).toBeDefined();
    });

    it('should render exactly 2 tab screens', () => {
      useColorSchemeSpy.mockReturnValue('light');

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);

      expect(screens).toHaveLength(2);
    });
  });

  describe('Tab Icons', () => {
    it('should render Home icon for index screen with correct props', () => {
      useColorSchemeSpy.mockReturnValue('light');

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
      useColorSchemeSpy.mockReturnValue('light');

      const { UNSAFE_root } = render(<TabsLayout />);
      const screens = UNSAFE_root.findAllByType('TabsScreen' as any);
      const settingsScreen = screens.find((s: any) => s.props.name === 'settings/index');

      const iconElement = settingsScreen.props.options.tabBarIcon({ color: '#94A3B8' });
      const rendered = render(iconElement);
      const icon = rendered.getByTestId('settings-icon');

      expect(icon.props.size).toBe(22);
      expect(icon.props.color).toBe('#94A3B8');
    });

    it('should pass different colors to tab icons correctly', () => {
      useColorSchemeSpy.mockReturnValue('dark');

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
      useColorSchemeSpy.mockReturnValue('light');

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
      expect(screenNames).toContain('settings/index');
    });
  });
});
