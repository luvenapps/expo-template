import type { ComponentProps } from 'react';
import type { TextProps } from 'tamagui';
import { Button } from 'tamagui';

export type PrimaryButtonProps = ComponentProps<typeof Button> & {
  textProps?: TextProps;
};

export function PrimaryButton({ size = 'md', textProps, children, ...rest }: PrimaryButtonProps) {
  let mergedTextProps: TextProps = { textTransform: 'capitalize' };
  if (textProps) {
    mergedTextProps = { ...mergedTextProps, ...textProps };
  }

  return (
    <Button
      size={size}
      width="100%"
      backgroundColor="accent-color hover:accentColorHover press:accentColorHover disabled:colorMuted"
      color="white"
      fontWeight="2"
      minHeight="8"
      outlineWidth="focus:focusRing"
      outlineColor="focus:outline-color"
      outlineStyle="focus:solid"
      opacity="disabled:0.7"
      {...rest}
      textProps={mergedTextProps}
    >
      {children}
    </Button>
  );
}
