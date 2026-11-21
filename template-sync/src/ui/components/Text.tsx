import type { ComponentProps } from 'react';
import { Text } from 'tamagui';
import { Platform } from 'react-native';

type TextProps = ComponentProps<typeof Text>;

function createTextVariant(defaults: TextProps) {
  return function TextVariant({ color = defaults.color ?? 'color', ...props }: TextProps) {
    return (
      <Text
        fontFamily={Platform.OS === 'web' ? 'serif' : undefined}
        {...defaults}
        color={color}
        {...props}
      />
    );
  };
}

export const TitleText = createTextVariant({
  fontSize: 'title',
  fontWeight: '5',
  textAlign: 'left',
});

export const SubtitleText = createTextVariant({
  fontSize: '4',
  color: 'colorMuted',
});

export const BodyText = createTextVariant({
  fontSize: '3',
});

export const CaptionText = createTextVariant({
  fontSize: 'caption',
  color: 'colorMuted',
});

export const LabelText = createTextVariant({
  fontSize: 'caption',
  fontWeight: '4',
});
