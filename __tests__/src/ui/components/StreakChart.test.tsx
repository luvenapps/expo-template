// Mock Tamagui
jest.mock('tamagui', () => {
  const mockReact = jest.requireActual('react');

  return {
    YStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    XStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
  };
});

// Mock Text components
jest.mock('@/ui/components/Text', () => {
  const mockReact = jest.requireActual('react');

  return {
    LabelText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    CaptionText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
  };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { View, Text } from 'react-native';
import { StreakChart } from '@/ui/components/StreakChart';

describe('StreakChart', () => {
  it('renders with basic data', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[
          { label: 'Current Streak', value: 5, max: 10 },
          { label: 'Longest Streak', value: 15, max: 30 },
        ]}
      />,
    );

    expect(getByTestId('streak-0-label')).toHaveTextContent('Current Streak • 5 days');
    expect(getByTestId('streak-1-label')).toHaveTextContent('Longest Streak • 15 days');
    expect(getByTestId('streak-0-percent')).toHaveTextContent('50% complete');
    expect(getByTestId('streak-1-percent')).toHaveTextContent('50% complete');
  });

  it('renders singular "day" when value is 1', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[{ label: 'Current Streak', value: 1, max: 10 }]}
      />,
    );

    expect(getByTestId('streak-0-label')).toHaveTextContent('Current Streak • 1 day');
  });

  it('renders plural "days" when value is not 1', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[
          { label: 'Zero days', value: 0, max: 10 },
          { label: 'Multiple days', value: 5, max: 10 },
        ]}
      />,
    );

    expect(getByTestId('streak-0-label')).toHaveTextContent('Zero days • 0 days');
    expect(getByTestId('streak-1-label')).toHaveTextContent('Multiple days • 5 days');
  });

  it('renders with icon when provided', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
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
    expect(getByTestId('streak-0-label')).toHaveTextContent('With Icon • 3 days');
  });

  it('renders without icon when not provided', async () => {
    const { queryByTestId } = await render(
      <StreakChart data={[{ label: 'Without Icon', value: 3, max: 10 }]} />,
    );

    expect(queryByTestId('streak-icon')).toBeNull();
  });

  it('uses default max value of 1 when max is not provided', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[{ label: 'Default Max', value: 1 }]}
      />,
    );

    expect(getByTestId('streak-0-percent')).toHaveTextContent('100% complete');
  });

  it('calculates percent correctly with custom max', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[
          { label: 'Quarter', value: 25, max: 100 },
          { label: 'Half', value: 50, max: 100 },
          { label: 'Three Quarters', value: 75, max: 100 },
        ]}
      />,
    );

    expect(getByTestId('streak-0-percent')).toHaveTextContent('25% complete');
    expect(getByTestId('streak-1-percent')).toHaveTextContent('50% complete');
    expect(getByTestId('streak-2-percent')).toHaveTextContent('75% complete');
  });

  it('caps percent at 100% when value exceeds max', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[{ label: 'Over Max', value: 15, max: 10 }]}
      />,
    );

    expect(getByTestId('streak-0-percent')).toHaveTextContent('100% complete');
  });

  it('floors percent at 0% when value is negative', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[{ label: 'Negative', value: -5, max: 10 }]}
      />,
    );

    expect(getByTestId('streak-0-percent')).toHaveTextContent('0% complete');
  });

  it('handles zero max gracefully', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[{ label: 'Zero Max', value: 5, max: 0 }]}
      />,
    );

    // value / 0 = Infinity, Math.min(1, Infinity) = 1
    expect(getByTestId('streak-0-percent')).toHaveTextContent('100% complete');
  });

  it('renders multiple streaks correctly', async () => {
    const { getByTestId } = await render(
      <StreakChart
        getItemTestID={(_, index) => `streak-${index}`}
        data={[
          { label: 'Streak 1', value: 3, max: 10 },
          { label: 'Streak 2', value: 7, max: 10 },
          { label: 'Streak 3', value: 10, max: 10 },
        ]}
      />,
    );

    expect(getByTestId('streak-0-label')).toHaveTextContent('Streak 1 • 3 days');
    expect(getByTestId('streak-1-label')).toHaveTextContent('Streak 2 • 7 days');
    expect(getByTestId('streak-2-label')).toHaveTextContent('Streak 3 • 10 days');
    expect(getByTestId('streak-0-percent')).toHaveTextContent('30% complete');
    expect(getByTestId('streak-1-percent')).toHaveTextContent('70% complete');
    expect(getByTestId('streak-2-percent')).toHaveTextContent('100% complete');
  });

  it('renders with empty data array', async () => {
    const { toJSON } = await render(<StreakChart data={[]} />);
    expect(toJSON()).toBeDefined();
  });
});
