import type { PropsWithChildren, ReactNode } from 'react';
import { Card, Paragraph, XStack, YStack } from 'tamagui';

type SettingsSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  icon?: ReactNode;
  footer?: ReactNode | string;
  align?: 'start' | 'center';
  testID?: string;
  descriptionTestID?: string;
  footerTestID?: string;
}>;

export function SettingsSection({
  title,
  description,
  icon,
  children,
  footer,
  testID,
  descriptionTestID,
  footerTestID,
}: SettingsSectionProps) {
  return (
    <Card size="$4" bordered backgroundColor="$surface" testID={testID}>
      <Card.Header padded gap="$2" alignItems="center">
        <XStack alignItems="center" gap="$2">
          {icon}
          <Paragraph
            fontWeight="700"
            fontSize="$5"
            color="$color"
            paddingBottom="$1"
            textTransform="capitalize"
          >
            {title}
          </Paragraph>
        </XStack>
        {description ? (
          <Paragraph
            color="$colorMuted"
            fontSize="$3"
            textAlign="center"
            testID={descriptionTestID}
          >
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
            <Paragraph color="$colorMuted" fontSize="$2" textAlign="center" testID={footerTestID}>
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
