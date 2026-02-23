import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOptionalThemeContext } from '@/ui/theme/ThemeProvider';
import { YStack } from 'tamagui';

type ScreenContainerProps = PropsWithChildren<{
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  paddingHorizontal?: string | number;
  gap?: string | number;
  backgroundColor?: string;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  contentContainerStyle?: ScrollView['props']['contentContainerStyle'];
}>;

export function ScreenContainer({
  children,
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  paddingHorizontal = '$6',
  gap,
  backgroundColor,
  scrollable = true,
  keyboardAvoiding = true,
  contentContainerStyle,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const themeContext = useOptionalThemeContext();
  const palette = themeContext?.palette;
  const topPadding = Math.min(Math.max(insets.top + 8, 16), 28);
  const bottomPadding = Math.max(insets.bottom, 12) + 12;

  const resolvedBackground = backgroundColor ?? '$background';
  const backgroundTokenMap: Record<string, string | undefined> = {
    $background: palette?.background,
    $backgroundStrong: palette?.surface,
    $surface: palette?.surface,
    $backgroundHover: palette?.secondaryBackground,
  };
  const resolvedNativeBackground =
    typeof resolvedBackground === 'string' && resolvedBackground.startsWith('$')
      ? (backgroundTokenMap[resolvedBackground] ?? palette?.background)
      : resolvedBackground;
  const keyboardBehavior: 'padding' | 'height' = Platform.OS === 'ios' ? 'padding' : 'height';

  const content = (
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
      gap={gap}
    >
      {children}
    </YStack>
  );

  const maybeScrollable = scrollable ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: resolvedNativeBackground }}
      contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  if (!keyboardAvoiding) {
    return maybeScrollable;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: resolvedNativeBackground }}
      behavior={keyboardBehavior}
      keyboardVerticalOffset={70}
    >
      {maybeScrollable}
    </KeyboardAvoidingView>
  );
}
