import { useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Dialog, Paragraph, XStack, YStack, useTheme } from 'tamagui';
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
  const theme = useTheme();
  const strokeColor = theme.color?.get() ?? '#111';
  const { width } = useWindowDimensions();
  const size = width < 390 ? 300 : 500;

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
          height="87%"
        >
          <YStack gap="$4" flex={1} justifyContent="space-between">
            <YStack gap="$4">
              <Dialog.Title asChild>
                <Paragraph
                  fontSize="$5"
                  fontWeight="700"
                  lineHeight={60}
                  textTransform="capitalize"
                >
                  {title}
                </Paragraph>
              </Dialog.Title>
              <Dialog.Description asChild>
                <Paragraph fontSize="$4">{message}</Paragraph>
              </Dialog.Description>
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
            </YStack>
            <XStack justifyContent="center" flex={1} alignItems="center">
              <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
                <Path
                  d="M16 24c0-4 3-8 8-8h24c5 0 8 4 8 8v24c0 4-3 8-8 8H24c-5 0-8-4-8-8V24z"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <Path
                  d="M36 12v8M28 30h16M28 38h16M28 46h8"
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </Svg>
            </XStack>
            <PrimaryButton onPress={handleSave} disabled={!canSave} testID="name-prompt-save">
              {actionLabel}
            </PrimaryButton>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
