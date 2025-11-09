import type { ComponentProps } from 'react';
import { Text } from 'tamagui';

type TextProps = ComponentProps<typeof Text>;

function createTextVariant(defaults: TextProps) {
  return function TextVariant({ color = defaults.color ?? '$color', ...props }: TextProps) {
    return <Text {...defaults} color={color} {...props} />;
  };
}

export const TitleText = createTextVariant({
  fontSize: 28,
  fontWeight: '700',
  textAlign: 'left',
});

export const SubtitleText = createTextVariant({
  fontSize: 18,
  color: '$colorMuted',
});

export const BodyText = createTextVariant({
  fontSize: 16,
});

export const CaptionText = createTextVariant({
  fontSize: 15,
  color: '$colorMuted',
});

export const LabelText = createTextVariant({
  fontSize: 15,
  fontWeight: '600',
});
