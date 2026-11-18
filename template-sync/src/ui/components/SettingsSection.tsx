import { Children, Fragment, isValidElement, type PropsWithChildren, type ReactNode } from 'react';
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
  const flatten = (children: ReactNode): ReactNode[] => {
    return Children.toArray(children).flatMap((child) => {
      if (isValidElement(child) && child.type === Fragment) {
        const fragmentProps = child.props as { children?: ReactNode };
        return flatten(fragmentProps.children);
      }
      return child;
    });
  };

  const wrappedChildren = flatten(children).map((child, index) => {
    const key = `item-${index}`;
    const content =
      typeof child === 'string' || typeof child === 'number' ? (
        <Paragraph>{child}</Paragraph>
      ) : (
        child
      );

    return (
      <XStack flexDirection="row" key={key} width="100%">
        {content}
      </XStack>
    );
  });

  return (
    <Card
      borderRadius="4"
      backgroundColor="surface"
      borderWidth={1}
      borderColor="border-color"
      testID={testID}
    >
      <Card.Header padding="4" gap="2" alignItems="center">
        <XStack flexDirection="row" alignItems="center" gap="2">
          {icon}
          <Paragraph
            fontWeight="700"
            fontSize="5"
            color="color"
            paddingBottom="1"
            textTransform="capitalize"
          >
            {title}
          </Paragraph>
        </XStack>
        {description ? (
          <Paragraph color="colorMuted" fontSize="3" textAlign="center" testID={descriptionTestID}>
            {description}
          </Paragraph>
        ) : null}
      </Card.Header>
      <YStack gap="3" paddingHorizontal="3" paddingBottom="3">
        {wrappedChildren}
      </YStack>
      {footer ? (
        <Card.Footer padding="4">
          {typeof footer === 'string' ? (
            <Paragraph color="colorMuted" fontSize="2" textAlign="center" testID={footerTestID}>
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
