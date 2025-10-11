import { PropsWithChildren } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

type ScreenContainerProps = PropsWithChildren<{
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  paddingHorizontal?: string | number;
  gap?: string | number;
  backgroundColor?: string;
}>;

export function ScreenContainer({
  children,
  justifyContent = 'center',
  alignItems = 'center',
  paddingHorizontal = '$6',
  gap,
  backgroundColor = '$background',
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <YStack
      flex={1}
      justifyContent={justifyContent}
      alignItems={alignItems}
      paddingTop={insets.top + 24}
      paddingBottom={insets.bottom + 24}
      paddingHorizontal={paddingHorizontal}
      backgroundColor={backgroundColor}
      gap={gap}
    >
      {children}
    </YStack>
  );
}
