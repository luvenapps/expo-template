import type { ComponentProps } from 'react';
import type { TextProps } from 'tamagui';
import { Button } from 'tamagui';

export type PrimaryButtonProps = ComponentProps<typeof Button> & {
  textProps?: TextProps;
};

export function PrimaryButton({ size = '$5', textProps, children, ...rest }: PrimaryButtonProps) {
  return (
    <Button
      size={size}
      width="100%"
      backgroundColor="$accentColor"
      color="white"
      fontWeight="600"
      minHeight={48}
      hoverStyle={{ backgroundColor: '$accentColorHover' }}
      pressStyle={{ backgroundColor: '$accentColorHover' }}
      focusStyle={{
        outlineWidth: 2,
        outlineColor: '$outlineColor',
        outlineStyle: 'solid',
      }}
      disabledStyle={{
        backgroundColor: '$colorMuted',
        opacity: 0.7,
      }}
      textProps={textProps}
      {...rest}
    >
      {children}
    </Button>
  );
}
