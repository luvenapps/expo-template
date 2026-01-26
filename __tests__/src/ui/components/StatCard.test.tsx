// Mock Tamagui primitives to basic RN components
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  return {
    Card: ({ children, ...props }: any) => React.createElement('View', props, children),
    YStack: ({ children, ...props }: any) => React.createElement('View', props, children),
    XStack: ({ children, ...props }: any) => React.createElement('View', props, children),
  };
});

// Mock Text components to simple Text for assertions
jest.mock('@/ui/components/Text', () => {
  const React = jest.requireActual('react');
  return {
    BodyText: ({ children, ...props }: any) => React.createElement('Text', props, children),
    CaptionText: ({ children, ...props }: any) => React.createElement('Text', props, children),
    TitleText: ({ children, ...props }: any) => React.createElement('Text', props, children),
  };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { StatCard } from '@/ui/components/StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    const { getByText } = render(<StatCard label="Streak" value={7} />);

    expect(getByText('Streak')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });

  it('renders helper text when provided', () => {
    const { getByText } = render(
      <StatCard label="Progress" value="42%" helperText="Last 7 days" />,
    );

    expect(getByText('Last 7 days')).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { getByText } = render(<StatCard label="Score" value={10} icon={<Text>Icon</Text>} />);

    expect(getByText('Icon')).toBeTruthy();
  });
});
