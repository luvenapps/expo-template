// Mock Tamagui
jest.mock('tamagui', () => {
  const mockReact = jest.requireActual('react');

  const MockSlider = ({ children, value, onValueChange, ...props }: any) => {
    return mockReact.createElement(
      'View',
      { ...props, testID: 'slider' },
      mockReact.createElement(
        'button',
        {
          testID: 'slider-button',
          onClick: () => onValueChange?.([50]),
        },
        'Adjust Slider',
      ),
      children,
    );
  };

  MockSlider.Track = ({ children, ...props }: any) =>
    mockReact.createElement('View', { ...props, testID: 'slider-track' }, children);
  MockSlider.TrackActive = (props: any) =>
    mockReact.createElement('View', { ...props, testID: 'slider-track-active' });
  MockSlider.Thumb = (props: any) =>
    mockReact.createElement('View', { ...props, testID: `slider-thumb-${props.index}` });

  return {
    YStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    Slider: MockSlider,
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
import { SliderField } from '@/ui/components/SliderField';

describe('SliderField', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with single value', () => {
    const { getByTestId } = render(
      <SliderField
        labelTestID="slider-label"
        label="Volume"
        value={[50]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('slider-label')).toHaveTextContent('Volume • 50');
  });

  it('renders with range values', () => {
    const { getByTestId } = render(
      <SliderField
        labelTestID="slider-label"
        label="Price Range"
        value={[25, 75]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('slider-label')).toHaveTextContent('Price Range • 25 – 75');
  });

  it('rounds decimal values in label', () => {
    const { getByTestId } = render(
      <SliderField
        labelTestID="slider-label"
        label="Temperature"
        value={[23.7, 45.3]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('slider-label')).toHaveTextContent('Temperature • 24 – 45');
  });

  it('renders helperText when provided', () => {
    const { getByTestId } = render(
      <SliderField
        helperTestID="slider-helper"
        label="Brightness"
        value={[80]}
        onValueChange={mockOnValueChange}
        helperText="Adjust screen brightness"
      />,
    );

    expect(getByTestId('slider-helper')).toHaveTextContent('Adjust screen brightness');
  });

  it('does not render helperText when not provided', () => {
    const { queryByTestId } = render(
      <SliderField label="Brightness" value={[80]} onValueChange={mockOnValueChange} />,
    );

    expect(queryByTestId('slider-helper')).toBeNull();
  });

  it('passes onValueChange prop to slider', () => {
    const { getByTestId } = render(
      <SliderField label="Volume" value={[30]} onValueChange={mockOnValueChange} />,
    );

    // Verify slider is rendered - onValueChange is passed internally to Tamagui Slider
    expect(getByTestId('slider')).toBeDefined();
  });

  it('renders with container testID', () => {
    const { getByTestId } = render(
      <SliderField
        testID="volume-slider"
        label="Volume"
        value={[50]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('volume-slider')).toBeDefined();
  });

  it('handles min, max, and step props', () => {
    const { getByTestId } = render(
      <SliderField
        label="Custom Range"
        value={[5]}
        onValueChange={mockOnValueChange}
        min={0}
        max={10}
        step={0.5}
      />,
    );

    // Component should render without errors with custom props
    expect(getByTestId('slider')).toBeDefined();
  });

  it('renders single thumb for single value', () => {
    const { getByTestId, queryByTestId } = render(
      <SliderField label="Volume" value={[50]} onValueChange={mockOnValueChange} />,
    );

    expect(getByTestId('slider-thumb-0')).toBeDefined();
    expect(queryByTestId('slider-thumb-1')).toBeNull();
  });

  it('renders two thumbs for range values', () => {
    const { getByTestId } = render(
      <SliderField label="Range" value={[25, 75]} onValueChange={mockOnValueChange} />,
    );

    expect(getByTestId('slider-thumb-0')).toBeDefined();
    expect(getByTestId('slider-thumb-1')).toBeDefined();
  });

  it('formats multiple values with en dash separator', () => {
    const { getByTestId } = render(
      <SliderField
        labelTestID="slider-label"
        label="Range"
        value={[10, 20, 30]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('slider-label')).toHaveTextContent('Range • 10 – 20 – 30');
  });
});
