import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOptionalThemeContext } from '@/ui/theme/ThemeProvider';
import { sizeTokenValues, spaceTokenValues } from '@/ui/theme/tokenValues';
import { YStack } from 'tamagui';

type ScreenBackgroundToken = 'background' | 'backgroundStrong' | 'surface' | 'background-hover';

type ScreenContainerProps = PropsWithChildren<{
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  paddingHorizontal?: string;
  gap?: string;
  backgroundColor?: ScreenBackgroundToken;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}>;

export function ScreenContainer({
  children,
  justifyContent = 'flex-start',
  alignItems = 'stretch',
  paddingHorizontal = '6',
  gap,
  backgroundColor,
  scrollable = true,
  keyboardAvoiding = true,
  contentContainerStyle,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const themeContext = useOptionalThemeContext();
  const palette = themeContext?.palette;
  const topPadding = Math.min(
    Math.max(insets.top + spaceTokenValues.screenTopOffset, spaceTokenValues.screenTopPaddingMin),
    spaceTokenValues.screenTopPaddingMax,
  );
  const bottomPadding =
    Math.max(insets.bottom, spaceTokenValues.screenBottomPaddingMin) +
    spaceTokenValues.screenBottomPaddingOffset;

  const resolvedBackground = backgroundColor ?? 'background';
  const backgroundTokenMap: Record<ScreenBackgroundToken, string | undefined> = {
    background: palette?.background,
    backgroundStrong: palette?.surface,
    surface: palette?.surface,
    'background-hover': palette?.secondaryBackground,
  };
  const resolvedNativeBackground = backgroundTokenMap[resolvedBackground] ?? palette?.background;
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
      keyboardVerticalOffset={sizeTokenValues.keyboardVerticalOffset}
    >
      {maybeScrollable}
    </KeyboardAvoidingView>
  );
}
