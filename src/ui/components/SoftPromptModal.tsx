import { useRef } from 'react';
import { Dialog, Paragraph, XStack, YStack } from 'tamagui';
import { PrimaryButton } from '../components/PrimaryButton';

type SoftPromptModalProps = {
  open: boolean;
  title: string;
  message: string;
  allowLabel?: string;
  notNowLabel?: string;
  onAllow: () => void;
  onNotNow: () => void;
  onOpenChange?: (open: boolean) => void;
};

export function SoftPromptModal({
  open,
  title,
  message,
  allowLabel,
  notNowLabel,
  onAllow,
  onNotNow,
  onOpenChange,
}: SoftPromptModalProps) {
  const resolvedAllowLabel = allowLabel ?? '';
  const resolvedNotNowLabel = notNowLabel ?? '';
  // Require the user to press one of the actions before the modal can close.
  const allowCloseRef = useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !allowCloseRef.current) {
      return;
    }
    allowCloseRef.current = false;
    onOpenChange?.(nextOpen);
  };

  const handleNotNow = () => {
    allowCloseRef.current = true;
    onNotNow();
  };

  const handleAllow = () => {
    allowCloseRef.current = true;
    onAllow();
  };

  return (
    <Dialog modal open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay key="soft-prompt-overlay" />
        <Dialog.Content
          key="soft-prompt-content"
          bordered
          elevate
          padding="$4"
          alignSelf="center"
          width="100%"
        >
          <YStack gap="$4" flex={1} justifyContent="space-between" minHeight={200}>
            <YStack gap="$3">
              <Dialog.Title asChild>
                <Paragraph fontSize="$5" fontWeight="700">
                  {title}
                </Paragraph>
              </Dialog.Title>
              <Dialog.Description asChild>
                <Paragraph fontSize="$4">{message}</Paragraph>
              </Dialog.Description>
            </YStack>
            <XStack gap="$3" justifyContent="center">
              <PrimaryButton
                width="auto"
                minWidth={180}
                onPress={handleNotNow}
                testID="soft-prompt-not-now"
                aria-label="soft-prompt-not-now"
                variant="outlined"
                backgroundColor="transparent"
                color="$color"
                borderColor="$borderColor"
              >
                {resolvedNotNowLabel}
              </PrimaryButton>
              <PrimaryButton
                width="auto"
                minWidth={180}
                onPress={handleAllow}
                testID="soft-prompt-allow"
                aria-label="soft-prompt-allow"
              >
                {resolvedAllowLabel}
              </PrimaryButton>
            </XStack>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
