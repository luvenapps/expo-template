// Mock Tamagui Paragraph to a basic Text component
jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  return {
    Paragraph: ({ children, ...props }: any) => React.createElement('Text', props, children),
  };
});

import { render } from '@testing-library/react-native';
import React from 'react';
import { InlineError } from '@/ui/components/InlineError';

describe('InlineError', () => {
  it('renders message when provided', () => {
    const { getByTestId } = render(<InlineError message="Something went wrong" testID="error" />);

    const error = getByTestId('error');
    expect(error.props.children).toBe('Something went wrong');
  });

  it('returns null when message is empty', () => {
    const { queryByTestId } = render(<InlineError message={null} testID="error" />);

    expect(queryByTestId('error')).toBeNull();
  });
});
