import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('tamagui', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Button = ({ children, ...props }: any) => React.createElement(View, props, children);
  Button.displayName = 'Button';

  return {
    Button,
  };
});

import { PrimaryButton } from '@/ui/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('adds uppercase textTransform by default', () => {
    const { getByTestId } = render(<PrimaryButton testID="primary">Label</PrimaryButton>);
    const button = getByTestId('primary');

    expect(button.props.textProps).toEqual(
      expect.objectContaining({
        textTransform: 'capitalize',
      }),
    );
  });

  it('allows textProps to override defaults', () => {
    const { getByTestId } = render(
      <PrimaryButton testID="primary" textProps={{ textTransform: 'none', fontSize: '$3' }}>
        Label
      </PrimaryButton>,
    );
    const button = getByTestId('primary');

    expect(button.props.textProps).toEqual(
      expect.objectContaining({
        textTransform: 'none',
        fontSize: '$3',
      }),
    );
  });
});
