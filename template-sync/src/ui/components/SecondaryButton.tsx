import type { ComponentProps } from 'react';
import type { TextProps } from 'tamagui';
import { Button } from 'tamagui';

export type SecondaryButtonProps = ComponentProps<typeof Button> & {
  textProps?: TextProps;
};

export function SecondaryButton({
  size = 'legacy4',
  textProps,
  children,
  ...rest
}: SecondaryButtonProps) {
  let mergedTextProps: TextProps = { textTransform: 'capitalize' };
  if (textProps) {
    mergedTextProps = { ...mergedTextProps, ...textProps };
  }

  return (
    <Button
      width="100%"
      size={size}
      borderRadius="3"
      backgroundColor="secondaryBackground hover:backgroundStrong press:background-press disabled:background"
      color="secondaryText"
      borderWidth={1}
      borderColor="border-color"
      fontWeight="400"
      minHeight={48}
      outlineWidth="focus:2px"
      outlineColor="focus:outline-color"
      outlineStyle="focus:solid"
      opacity="disabled:0.6"
      {...rest}
      textProps={mergedTextProps}
    >
      {children}
    </Button>
  );
}
