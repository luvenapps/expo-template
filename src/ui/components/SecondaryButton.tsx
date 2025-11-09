import type { ComponentProps } from 'react';
import { Button } from 'tamagui';

export type SecondaryButtonProps = ComponentProps<typeof Button>;

export function SecondaryButton({ size = '$5', children, ...rest }: SecondaryButtonProps) {
  return (
    <Button
      width="100%"
      size={size}
      borderRadius="$3"
      backgroundColor="$background"
      color="$accentColor"
      borderWidth={1}
      borderColor="$borderColor"
      fontWeight="600"
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
      {...rest}
    >
      {children}
    </Button>
  );
}
