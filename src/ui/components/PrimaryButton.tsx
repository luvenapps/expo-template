import type { ComponentProps } from 'react';
import { Button } from 'tamagui';

export type PrimaryButtonProps = ComponentProps<typeof Button>;

export function PrimaryButton({ size = '$5', children, ...rest }: PrimaryButtonProps) {
  return (
    <Button
      size={size}
      borderRadius="$3"
      backgroundColor="$accentColor"
      color="white"
      fontWeight="600"
      justifyContent="center"
      alignItems="center"
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
      {...rest}
    >
      {children}
    </Button>
  );
}
