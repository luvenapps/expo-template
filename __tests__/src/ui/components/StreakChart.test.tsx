// Mock Tamagui
jest.mock('tamagui', () => {
  const mockReact = jest.requireActual('react');

  return {
    YStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    XStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
  };
});

// Mock Text components
jest.mock('../../../../src/ui/components/Text', () => {
  const mockReact = jest.requireActual('react');

  return {
    LabelText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    CaptionText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
  };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { View, Text } from 'react-native';
import { StreakChart } from '../../../../src/ui/components/StreakChart';

describe('StreakChart', () => {
  it('renders with basic data', () => {
    const { getByText, getAllByText } = render(
      <StreakChart
        data={[
          { label: 'Current Streak', value: 5, max: 10 },
          { label: 'Longest Streak', value: 15, max: 30 },
        ]}
      />,
    );

    expect(getByText(/Current Streak • 5 days/)).toBeDefined();
    expect(getByText(/Longest Streak • 15 days/)).toBeDefined();
    expect(getAllByText('50% complete')).toHaveLength(2);
  });

  it('renders singular "day" when value is 1', () => {
    const { getByText } = render(
      <StreakChart data={[{ label: 'Current Streak', value: 1, max: 10 }]} />,
    );

    expect(getByText(/Current Streak • 1 day$/)).toBeDefined();
  });

  it('renders plural "days" when value is not 1', () => {
    const { getByText } = render(
      <StreakChart
        data={[
          { label: 'Zero days', value: 0, max: 10 },
          { label: 'Multiple days', value: 5, max: 10 },
        ]}
      />,
    );

    expect(getByText(/Zero days • 0 days/)).toBeDefined();
    expect(getByText(/Multiple days • 5 days/)).toBeDefined();
  });

  it('renders with icon when provided', () => {
    const { getByTestId } = render(
      <StreakChart
        data={[
          {
            label: 'With Icon',
            value: 3,
            max: 10,
            icon: (
              <View testID="streak-icon">
                <Text>🔥</Text>
              </View>
            ),
          },
        ]}
      />,
    );

    expect(getByTestId('streak-icon')).toBeDefined();
  });

  it('renders without icon when not provided', () => {
    const { queryByTestId } = render(
      <StreakChart data={[{ label: 'Without Icon', value: 3, max: 10 }]} />,
    );

    expect(queryByTestId('streak-icon')).toBeNull();
  });

  it('uses default max value of 1 when max is not provided', () => {
    const { getByText } = render(<StreakChart data={[{ label: 'Default Max', value: 1 }]} />);

    expect(getByText('100% complete')).toBeDefined();
  });

  it('calculates percent correctly with custom max', () => {
    const { getByText } = render(
      <StreakChart
        data={[
          { label: 'Quarter', value: 25, max: 100 },
          { label: 'Half', value: 50, max: 100 },
          { label: 'Three Quarters', value: 75, max: 100 },
        ]}
      />,
    );

    expect(getByText('25% complete')).toBeDefined();
    expect(getByText('50% complete')).toBeDefined();
    expect(getByText('75% complete')).toBeDefined();
  });

  it('caps percent at 100% when value exceeds max', () => {
    const { getByText } = render(
      <StreakChart data={[{ label: 'Over Max', value: 15, max: 10 }]} />,
    );

    expect(getByText('100% complete')).toBeDefined();
  });

  it('floors percent at 0% when value is negative', () => {
    const { getByText } = render(
      <StreakChart data={[{ label: 'Negative', value: -5, max: 10 }]} />,
    );

    expect(getByText('0% complete')).toBeDefined();
  });

  it('handles zero max gracefully', () => {
    const { getByText } = render(<StreakChart data={[{ label: 'Zero Max', value: 5, max: 0 }]} />);

    // value / 0 = Infinity, Math.min(1, Infinity) = 1
    expect(getByText('100% complete')).toBeDefined();
  });

  it('renders multiple streaks correctly', () => {
    const { getByText } = render(
      <StreakChart
        data={[
          { label: 'Streak 1', value: 3, max: 10 },
          { label: 'Streak 2', value: 7, max: 10 },
          { label: 'Streak 3', value: 10, max: 10 },
        ]}
      />,
    );

    expect(getByText(/Streak 1 • 3 days/)).toBeDefined();
    expect(getByText(/Streak 2 • 7 days/)).toBeDefined();
    expect(getByText(/Streak 3 • 10 days/)).toBeDefined();
    expect(getByText('30% complete')).toBeDefined();
    expect(getByText('70% complete')).toBeDefined();
    expect(getByText('100% complete')).toBeDefined();
  });

  it('renders with empty data array', () => {
    const { toJSON } = render(<StreakChart data={[]} />);
    expect(toJSON()).toBeDefined();
  });
});
