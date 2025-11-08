import type { PropsWithChildren, ReactNode } from 'react';
import { Paragraph, YStack } from 'tamagui';

type SettingsSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
  icon?: ReactNode;
}> & {
  footer?: ReactNode;
};

export function SettingsSection({
  title,
  description,
  icon,
  children,
  footer,
}: SettingsSectionProps) {
  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderRadius="$3"
      padding="$3"
      gap="$4"
      borderWidth={1}
      borderColor="$borderColor"
      shadowColor="rgba(15,23,42,0.12)"
      shadowOffset={{ width: 0, height: 8 }}
      shadowOpacity={0.08}
      shadowRadius={16}
    >
      <YStack gap="$2">
        <YStack flexDirection="row" alignItems="center" gap="$2">
          {icon}
          <Paragraph fontWeight="700" fontSize="$5">
            {title}
          </Paragraph>
        </YStack>
        {description ? (
          <Paragraph color="$colorMuted" fontSize="$3">
            {description}
          </Paragraph>
        ) : null}
      </YStack>
      <YStack gap="$3">{children}</YStack>
      {footer ? (
        <Paragraph color="$colorMuted" fontSize="$2">
          {footer}
        </Paragraph>
      ) : null}
    </YStack>
  );
}
