import { useRef } from 'react';
import { Dialog, Paragraph, YStack } from 'tamagui';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';

type NamePromptModalProps = {
  open: boolean;
  title: string;
  message: string;
  label: string;
  placeholder: string;
  value: string;
  actionLabel: string;
  onChangeText: (value: string) => void;
  onSave: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export function NamePromptModal({
  open,
  title,
  message,
  label,
  placeholder,
  value,
  actionLabel,
  onChangeText,
  onSave,
  onOpenChange,
}: NamePromptModalProps) {
  const allowCloseRef = useRef(false);
  const trimmed = value.trim();
  const canSave = trimmed.length > 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !allowCloseRef.current) {
      return;
    }
    allowCloseRef.current = false;
    onOpenChange?.(nextOpen);
  };

  const handleSave = () => {
    if (!canSave) {
      return;
    }
    allowCloseRef.current = true;
    onSave(trimmed);
  };

  return (
    <Dialog modal open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay key="name-prompt-overlay" />
        <Dialog.Content
          key="name-prompt-content"
          bordered
          elevate
          padding="$4"
          alignSelf="center"
          width="100%"
          maxWidth={480}
          height="90%"
        >
          <YStack gap="$4">
            <YStack gap="$2">
              <Dialog.Title asChild>
                <Paragraph fontSize="$5" fontWeight="700">
                  {title}
                </Paragraph>
              </Dialog.Title>
              <Dialog.Description asChild>
                <Paragraph fontSize="$4">{message}</Paragraph>
              </Dialog.Description>
            </YStack>
            <FormField
              label={label}
              placeholder={placeholder}
              placeholderTextColor="$colorMuted"
              autoCapitalize="words"
              value={value}
              required
              onChangeText={onChangeText}
              inputTestID="name-prompt-input"
              testID="name-prompt-field"
            />
            <PrimaryButton onPress={handleSave} disabled={!canSave} testID="name-prompt-save">
              {actionLabel}
            </PrimaryButton>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
