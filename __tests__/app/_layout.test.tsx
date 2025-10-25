const recordedScreens: string[] = [];
let recordedProps: Record<string, unknown> | undefined;

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('@/auth/session', () => ({
  initSessionListener: jest.fn().mockResolvedValue(undefined),
  useSessionStore: jest.fn(() => ({
    status: 'unauthenticated',
    session: null,
  })),
}));

jest.mock('@/sync', () => ({
  useSync: jest.fn().mockReturnValue({
    status: 'idle',
    queueSize: 0,
    lastSyncedAt: null,
    lastError: null,
    triggerSync: jest.fn(),
  }),
  pushOutbox: jest.fn(),
  pullUpdates: jest.fn(),
}));

jest.mock('expo-router', () => {
  const MockStack: any = ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    recordedProps = props;
    return <>{children}</>;
  };

  MockStack.Screen = ({ name, children }: { name: string; children?: React.ReactNode }) => {
    recordedScreens.push(name);
    return <>{children}</>;
  };
  MockStack.Screen.displayName = 'MockStack.Screen';

  return { Stack: MockStack };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import RootLayout from '../../app/_layout';

describe('RootLayout', () => {
  beforeEach(() => {
    recordedScreens.length = 0;
    recordedProps = undefined;
  });

  test('applies shared header options and registers screens', () => {
    render(<RootLayout />);

    expect(recordedProps?.screenOptions).toMatchObject({
      headerStyle: { backgroundColor: 'transparent' },
      headerTitleStyle: { fontWeight: '600' },
    });

    expect(recordedScreens).toEqual(expect.arrayContaining(['(auth)', '(tabs)', 'details']));
  });
});
