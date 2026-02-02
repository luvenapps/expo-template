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

import { SecondaryButton } from '@/ui/components/SecondaryButton';

describe('SecondaryButton', () => {
  it('adds uppercase textTransform by default', () => {
    const { getByTestId } = render(<SecondaryButton testID="secondary">Label</SecondaryButton>);
    const button = getByTestId('secondary');

    expect(button.props.textProps).toEqual(
      expect.objectContaining({
        textTransform: 'capitalize',
      }),
    );
  });

  it('allows textProps to override defaults', () => {
    const { getByTestId } = render(
      <SecondaryButton testID="secondary" textProps={{ textTransform: 'none', fontSize: '$3' }}>
        Label
      </SecondaryButton>,
    );
    const button = getByTestId('secondary');

    expect(button.props.textProps).toEqual(
      expect.objectContaining({
        textTransform: 'none',
        fontSize: '$3',
      }),
    );
  });
});
