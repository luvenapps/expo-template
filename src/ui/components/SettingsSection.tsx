import type { PropsWithChildren, ReactNode } from 'react';
import { useThemeContext } from '@/ui/theme/ThemeProvider';
import { Card, Paragraph, XStack, YStack } from 'tamagui';

type SettingsSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  icon?: ReactNode;
  footer?: ReactNode | string;
  align?: 'start' | 'center';
}>;

export function SettingsSection({
  title,
  description,
  icon,
  children,
  footer,
}: SettingsSectionProps) {
  const { resolvedTheme } = useThemeContext();
  const backgroundColor = resolvedTheme === 'dark' ? '$backgroundStrong' : '$background';

  return (
    <Card size="$4" bordered backgroundColor={backgroundColor}>
      <Card.Header padded gap="$2" alignItems="center">
        <XStack alignItems="center" gap="$2">
          {icon}
          <Paragraph fontWeight="700" fontSize="$5">
            {title}
          </Paragraph>
        </XStack>
        {description ? (
          <Paragraph color="$colorMuted" fontSize="$3" textAlign="center">
            {description}
          </Paragraph>
        ) : null}
      </Card.Header>
      <YStack gap="$3" paddingHorizontal="$3" paddingBottom="$3">
        {children}
      </YStack>
      {footer ? (
        <Card.Footer padded>
          {typeof footer === 'string' ? (
            <Paragraph color="$colorMuted" fontSize="$2" textAlign="center">
              {footer}
            </Paragraph>
          ) : (
            footer
          )}
        </Card.Footer>
      ) : null}
    </Card>
  );
}
