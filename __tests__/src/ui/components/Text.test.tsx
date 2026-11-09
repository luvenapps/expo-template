import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { BodyText, CaptionText, LabelText, SubtitleText, TitleText } from '@/ui/components/Text';

jest.mock('tamagui', () => {
  const React = jest.requireActual('react');
  return { Text: ({ children, ...props }: any) => React.createElement('Text', props, children) };
});

describe('semantic text', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS')!;
  afterEach(() => Object.defineProperty(Platform, 'OS', originalPlatform));

  it('preserves the production serif fallback on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    await render(<TitleText testID="text">Welcome</TitleText>);
    expect(screen.getByTestId('text').props.fontFamily).toBe('serif');
  });

  it.each([
    [TitleText, 28, 'color'],
    [SubtitleText, 18, 'colorMuted'],
    [BodyText, 16, 'color'],
    [CaptionText, 15, 'colorMuted'],
    [LabelText, 15, 'color'],
  ] as const)('uses its configured size and theme color', async (Component, fontSize, color) => {
    await render(<Component testID="text">Example</Component>);
    expect(screen.getByTestId('text').props).toEqual(expect.objectContaining({ fontSize, color }));
  });

  it('allows callers to override the theme color', async () => {
    await render(
      <BodyText testID="text" color="dangerColor">
        Example
      </BodyText>,
    );
    expect(screen.getByTestId('text').props.color).toBe('dangerColor');
  });
});
