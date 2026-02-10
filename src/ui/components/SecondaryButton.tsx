import type { ComponentProps } from 'react';
import type { TextProps } from 'tamagui';
import { Button } from 'tamagui';

export type SecondaryButtonProps = ComponentProps<typeof Button> & {
  textProps?: TextProps;
};

export function SecondaryButton({
  size = '$4',
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
      borderRadius="$3"
      backgroundColor="$secondaryBackground"
      color="$secondaryText"
      borderWidth={1}
      borderColor="$borderColor"
      fontWeight="400"
      minHeight={48}
      hoverStyle={{ backgroundColor: '$backgroundStrong' }}
      pressStyle={{ backgroundColor: '$backgroundPress' }}
      focusStyle={{
        outlineWidth: 2,
        outlineColor: '$outlineColor',
        outlineStyle: 'solid',
      }}
      disabledStyle={{
        backgroundColor: '$background',
        opacity: 0.6,
      }}
      textProps={mergedTextProps}
      {...rest}
    >
      {children}
    </Button>
  );
}
