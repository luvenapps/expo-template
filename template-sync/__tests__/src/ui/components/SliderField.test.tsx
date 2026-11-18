// Mock Tamagui with simplified structure to avoid segfaults
/* eslint-disable react/no-unknown-property */
jest.mock('tamagui', () => {
  const React = require('react');

  // Simplified mock components without complex createElement nesting
  function YStack(props: any) {
    return <div testID={props.testID} {...props} />;
  }

  function Slider(props: any) {
    return (
      <div testID="slider" {...props}>
        {props.children}
      </div>
    );
  }

  function Track(props: any) {
    return (
      <div testID="slider-track" {...props}>
        {props.children}
      </div>
    );
  }
  Slider.Track = Track;

  const TrackActive = (props: any) => <div testID="slider-track-active" {...props} />;
  Slider.TrackActive = TrackActive;

  const Thumb = (props: any) => <div testID={`slider-thumb-${props.index}`} {...props} />;
  Slider.Thumb = Thumb;

  return { YStack, Slider };
});
/* eslint-enable react/no-unknown-property */

// Mock Text components with simplified structure
jest.mock('@/ui/components/Text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const LabelText = (props: any) => React.createElement(Text, props, props.children);

  const CaptionText = (props: any) => React.createElement(Text, props, props.children);

  return { LabelText, CaptionText };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { SliderField } from '@/ui/components/SliderField';

describe('SliderField', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with single value', async () => {
    const { getByTestId } = await render(
      <SliderField
        labelTestID="slider-label"
        label="Volume"
        value={[50]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('slider-label')).toHaveTextContent('Volume • 50');
  });

  it('renders with range values', async () => {
    const { getByTestId } = await render(
      <SliderField
        labelTestID="slider-label"
        label="Price Range"
        value={[25, 75]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('slider-label')).toHaveTextContent('Price Range • 25 – 75');
  });

  it('rounds decimal values in label', async () => {
    const { getByTestId } = await render(
      <SliderField
        labelTestID="slider-label"
        label="Temperature"
        value={[23.7, 45.3]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('slider-label')).toHaveTextContent('Temperature • 24 – 45');
  });

  it('renders helperText when provided', async () => {
    const { getByTestId } = await render(
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

  it('does not render helperText when not provided', async () => {
    const { queryByTestId } = await render(
      <SliderField label="Brightness" value={[80]} onValueChange={mockOnValueChange} />,
    );

    expect(queryByTestId('slider-helper')).toBeNull();
  });

  it('passes onValueChange prop to slider', async () => {
    const { getByTestId } = await render(
      <SliderField label="Volume" value={[30]} onValueChange={mockOnValueChange} />,
    );

    // Verify slider is rendered - onValueChange is passed internally to Tamagui Slider
    expect(getByTestId('slider')).toBeDefined();
  });

  it('renders with container testID', async () => {
    const { getByTestId } = await render(
      <SliderField
        testID="volume-slider"
        label="Volume"
        value={[50]}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(getByTestId('volume-slider')).toBeDefined();
  });

  it('handles min, max, and step props', async () => {
    const { getByTestId } = await render(
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

  it('renders single thumb for single value', async () => {
    const { getByTestId, queryByTestId } = await render(
      <SliderField label="Volume" value={[50]} onValueChange={mockOnValueChange} />,
    );

    expect(getByTestId('slider-thumb-0')).toBeDefined();
    expect(queryByTestId('slider-thumb-1')).toBeNull();
  });

  it('renders two thumbs for range values', async () => {
    const { getByTestId } = await render(
      <SliderField label="Range" value={[25, 75]} onValueChange={mockOnValueChange} />,
    );

    expect(getByTestId('slider-thumb-0')).toBeDefined();
    expect(getByTestId('slider-thumb-1')).toBeDefined();
  });

  it('formats multiple values with en dash separator', async () => {
    const { getByTestId } = await render(
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
