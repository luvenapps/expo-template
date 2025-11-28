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
import { CalendarHeatmap } from '@/ui/components/CalendarHeatmap';

describe('CalendarHeatmap', () => {
  it('renders correct number of cells', () => {
    const { getAllByTestId } = render(
      <CalendarHeatmap
        weeks={2}
        values={[
          [0, 1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2, 3],
        ]}
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // 2 weeks × 7 days = 14 cells
    const cells = getAllByTestId(/^cell-/);
    expect(cells).toHaveLength(14);
  });

  it('maps intensity values to cells', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={1}
        values={[[0, 1, 2, 3, 4, 0, 1]]}
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // Verify cells exist (intensity mapping is internal, but cells should render)
    expect(getByTestId('cell-0-0')).toBeDefined();
    expect(getByTestId('cell-0-6')).toBeDefined();
  });

  it('handles missing values with default 0 intensity', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={2}
        values={[[1, 2, 3]]} // Only partial week data
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // Should render all cells without crashing
    expect(getByTestId('cell-0-0')).toBeDefined();
    expect(getByTestId('cell-1-6')).toBeDefined();
  });

  it('clamps negative intensity to 0', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={1}
        values={[[-5, 1, 2, 3, 4, 0, 1]]}
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // Should render without crashing (clamping is internal)
    expect(getByTestId('cell-0-0')).toBeDefined();
  });

  it('clamps excessive intensity to max color index', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={1}
        values={[[999, 1, 2, 3, 4, 0, 1]]}
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // Should render without crashing (clamping is internal)
    expect(getByTestId('cell-0-0')).toBeDefined();
  });

  it('renders default day labels', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={2}
        values={[
          [0, 1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2, 3],
        ]}
        dayLabelsTestID="day-labels"
      />,
    );

    expect(getByTestId('day-labels')).toHaveTextContent('S M T W T F S');
  });

  it('renders custom day labels', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={2}
        values={[
          [0, 1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2, 3],
        ]}
        dayLabels={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}
        dayLabelsTestID="day-labels"
      />,
    );

    expect(getByTestId('day-labels')).toHaveTextContent('Sun Mon Tue Wed Thu Fri Sat');
  });

  it('renders default legend when not provided', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={2}
        values={[
          [0, 1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2, 3],
        ]}
        legendTestID="default-legend"
      />,
    );

    expect(getByTestId('default-legend')).toBeDefined();
  });

  it('renders custom legend when provided', () => {
    const customLegend = (
      <View testID="custom-legend">
        <Text>Custom Legend</Text>
      </View>
    );

    const { getByTestId, queryByTestId } = render(
      <CalendarHeatmap
        weeks={2}
        values={[
          [0, 1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2, 3],
        ]}
        legend={customLegend}
        legendTestID="default-legend"
      />,
    );

    expect(getByTestId('custom-legend')).toBeDefined();
    expect(queryByTestId('default-legend')).toBeNull();
  });

  it('renders with container testID', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        testID="heatmap-container"
        weeks={2}
        values={[
          [0, 1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2, 3],
        ]}
      />,
    );

    expect(getByTestId('heatmap-container')).toBeDefined();
  });

  it('handles empty values array', () => {
    const { getByTestId } = render(
      <CalendarHeatmap
        weeks={2}
        values={[]}
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // Should render cells with default 0 intensity
    expect(getByTestId('cell-0-0')).toBeDefined();
    expect(getByTestId('cell-1-6')).toBeDefined();
  });

  it('renders correct number of weeks', () => {
    const { getAllByTestId } = render(
      <CalendarHeatmap
        weeks={4}
        values={[
          [0, 1, 2, 3, 4, 0, 1],
          [2, 3, 4, 0, 1, 2, 3],
          [1, 2, 3, 4, 0, 1, 2],
          [3, 4, 0, 1, 2, 3, 4],
        ]}
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // 4 weeks × 7 days = 28 cells
    const cells = getAllByTestId(/^cell-/);
    expect(cells).toHaveLength(28);
  });

  it('handles zero weeks gracefully', () => {
    const { queryAllByTestId } = render(
      <CalendarHeatmap
        weeks={0}
        values={[]}
        getCellTestID={(week, day) => `cell-${week}-${day}`}
      />,
    );

    // Should render no cells
    const cells = queryAllByTestId(/^cell-/);
    expect(cells).toHaveLength(0);
  });
});
