import { PropsWithChildren } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useThemeContext } from '@/ui/theme/ThemeProvider';

type ScreenContainerProps = PropsWithChildren<{
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  paddingHorizontal?: string | number;
  gap?: string | number;
  backgroundColor?: string;
}>;

export function ScreenContainer({
  children,
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  paddingHorizontal = '$6',
  gap,
  backgroundColor,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 12) + 12;
  const bottomPadding = Math.max(insets.bottom, 12) + 12;
  const { palette } = useThemeContext();
  const resolvedBackground = backgroundColor ?? palette.background;
  const resolvedColor = palette.text;

  return (
    <YStack
      testID="screen-container"
      flex={1}
      width="100%"
      justifyContent={justifyContent}
      alignItems={alignItems}
      paddingTop={topPadding}
      paddingBottom={bottomPadding}
      paddingHorizontal={paddingHorizontal}
      backgroundColor={resolvedBackground}
      style={{ color: resolvedColor }}
      gap={gap}
    >
      {children}
    </YStack>
  );
}
