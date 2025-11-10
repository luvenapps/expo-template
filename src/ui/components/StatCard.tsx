import type { ComponentProps, ReactNode } from 'react';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { Card, XStack, YStack } from 'tamagui';
import { BodyText, CaptionText, TitleText } from './Text';

type CardProps = ComponentProps<typeof Card>;

type StatCardProps = {
  label: string;
  value: string | number;
  helperText?: string;
  icon?: ReactNode;
  flex?: CardProps['flex'];
  minWidth?: CardProps['minWidth'];
  maxWidth?: CardProps['maxWidth'];
};

export function StatCard({
  label,
  value,
  helperText,
  icon,
  flex,
  minWidth,
  maxWidth,
}: StatCardProps) {
  const { resolvedTheme } = useThemeContext();
  const backgroundColor = resolvedTheme === 'dark' ? '$backgroundStrong' : '$background';

  return (
    <Card
      bordered
      padding="$3"
      backgroundColor={backgroundColor}
      flex={flex}
      minWidth={minWidth}
      maxWidth={maxWidth}
    >
      <YStack gap="$2">
        <XStack alignItems="center" gap="$2">
          {icon}
          <CaptionText color="$colorMuted">{label}</CaptionText>
        </XStack>
        <TitleText fontSize="$4">{value}</TitleText>
        {helperText ? <BodyText color="$colorMuted">{helperText}</BodyText> : null}
      </YStack>
    </Card>
  );
}
