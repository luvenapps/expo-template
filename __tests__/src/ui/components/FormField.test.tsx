// Mock Tamagui
jest.mock('tamagui', () => {
  const mockReact = jest.requireActual('react');

  return {
    YStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    View: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    Input: ({ value, ...props }: any) => mockReact.createElement('TextInput', { value, ...props }),
    Text: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
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
import { FormField } from '../../../../src/ui/components/FormField';

describe('FormField', () => {
  it('renders with label and input', () => {
    const { getByText, getByDisplayValue } = render(
      <FormField label="Email" value="test@example.com" onChangeText={() => {}} />,
    );

    expect(getByText('Email')).toBeDefined();
    expect(getByDisplayValue('test@example.com')).toBeDefined();
  });

  it('renders with required indicator when required is true', () => {
    const { getByText } = render(
      <FormField label="Email" required value="" onChangeText={() => {}} />,
    );

    expect(getByText('Email *')).toBeDefined();
  });

  it('renders without required indicator when required is false', () => {
    const { getByText, queryByText } = render(
      <FormField label="Email" value="" onChangeText={() => {}} />,
    );

    expect(getByText('Email')).toBeDefined();
    expect(queryByText('Email *')).toBeNull();
  });

  it('renders helperText when provided', () => {
    const { getByText } = render(
      <FormField
        label="Email"
        helperText="Enter your email address"
        value=""
        onChangeText={() => {}}
      />,
    );

    expect(getByText('Enter your email address')).toBeDefined();
  });

  it('renders errorText when provided', () => {
    const { getByText } = render(
      <FormField label="Email" errorText="Invalid email" value="" onChangeText={() => {}} />,
    );

    expect(getByText('Invalid email')).toBeDefined();
  });

  it('prioritizes errorText over helperText when both are provided', () => {
    const { getByText, queryByText } = render(
      <FormField
        label="Email"
        helperText="Enter your email address"
        errorText="Invalid email"
        value=""
        onChangeText={() => {}}
      />,
    );

    expect(getByText('Invalid email')).toBeDefined();
    expect(queryByText('Enter your email address')).toBeNull();
  });

  it('renders rightElement when provided', () => {
    const React = require('react');
    const { View: RNView, Text: RNText } = require('react-native');

    const { getByTestId } = render(
      <FormField
        label="Password"
        value=""
        onChangeText={() => {}}
        rightElement={
          <RNView testID="right-element">
            <RNText>Icon</RNText>
          </RNView>
        }
      />,
    );

    expect(getByTestId('right-element')).toBeDefined();
  });

  it('does not render helperText or errorText when neither is provided', () => {
    const { queryByTestId } = render(<FormField label="Email" value="" onChangeText={() => {}} />);

    expect(queryByTestId('form-field-helper')).toBeNull();
  });
});
