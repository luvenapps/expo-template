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
    const { getByTestId, getByDisplayValue } = render(
      <FormField
        label="Email"
        labelTestID="email-label"
        inputTestID="email-input"
        value="test@example.com"
        onChangeText={() => {}}
      />,
    );

    expect(getByTestId('email-label')).toBeDefined();
    expect(getByDisplayValue('test@example.com')).toBeDefined();
  });

  it('renders with required indicator when required is true', () => {
    const { getByTestId } = render(
      <FormField
        label="Email"
        labelTestID="email-label"
        required
        value=""
        onChangeText={() => {}}
      />,
    );

    const label = getByTestId('email-label');
    expect(label.props.children).toEqual(['Email', ' *']);
  });

  it('renders without required indicator when required is false', () => {
    const { getByTestId } = render(
      <FormField label="Email" labelTestID="email-label" value="" onChangeText={() => {}} />,
    );

    const label = getByTestId('email-label');
    expect(label.props.children).toEqual(['Email', '']);
  });

  it('renders helperText when provided', () => {
    const { getByTestId } = render(
      <FormField
        label="Email"
        helperText="Enter your email address"
        helperTestID="helper-text"
        value=""
        onChangeText={() => {}}
      />,
    );

    const helperText = getByTestId('helper-text');
    expect(helperText.props.children).toBe('Enter your email address');
  });

  it('renders errorText when provided', () => {
    const { getByTestId } = render(
      <FormField
        label="Email"
        errorText="Invalid email"
        helperTestID="error-text"
        value=""
        onChangeText={() => {}}
      />,
    );

    const errorText = getByTestId('error-text');
    expect(errorText.props.children).toBe('Invalid email');
  });

  it('prioritizes errorText over helperText when both are provided', () => {
    const { getByTestId } = render(
      <FormField
        label="Email"
        helperText="Enter your email address"
        errorText="Invalid email"
        helperTestID="helper-or-error"
        value=""
        onChangeText={() => {}}
      />,
    );

    const helperOrError = getByTestId('helper-or-error');
    expect(helperOrError.props.children).toBe('Invalid email');
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
