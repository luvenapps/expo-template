import { useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Dialog, Paragraph, XStack, YStack, useTheme } from 'tamagui';
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
  const theme = useTheme();
  const strokeColor = theme.color?.get() ?? '#111';
  const resolvedAllowLabel = allowLabel ?? '';
  const resolvedNotNowLabel = notNowLabel ?? '';
  // Require the user to press one of the actions before the modal can close.
  const allowCloseRef = useRef(false);
  const { width, height: windowHeight } = useWindowDimensions();
  const size = width < 390 ? 200 : 300;
  const isWeb = Platform.OS === 'web';
  const dialogHeight = isWeb ? windowHeight * 0.88 : windowHeight * 0.85;

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
          maxWidth={480}
          height={dialogHeight}
        >
          <YStack gap="$4" flex={isWeb ? undefined : 1} justifyContent="space-between">
            <YStack gap="$3">
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
            </YStack>
            <XStack
              marginTop={isWeb ? 0 : -50}
              justifyContent="center"
              flex={1}
              alignItems="center"
            >
              <Svg width={size} height={size} viewBox="0 0 72 72" fill="none">
                <Circle cx="36" cy="36" r="32" stroke={strokeColor} strokeWidth="2" />
                <Path
                  d="M36 18c-7.2 0-13 5.8-13 13v8.5l-3.4 4.6c-.4.5 0 1.4.7 1.4h32.6c.7 0 1.1-.9.7-1.4L49 39.5V31c0-7.2-5.8-13-13-13Z"
                  stroke={strokeColor}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <Path
                  d="M31.5 50a4.5 4.5 0 0 0 9 0"
                  stroke={strokeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </Svg>
            </XStack>
            <YStack gap="$3" justifyContent="center">
              <PrimaryButton
                width="auto"
                onPress={handleAllow}
                testID="soft-prompt-allow"
                aria-label="soft-prompt-allow"
              >
                {resolvedAllowLabel}
              </PrimaryButton>
              <PrimaryButton
                width="auto"
                onPress={handleNotNow}
                testID="soft-prompt-not-now"
                aria-label="soft-prompt-not-now"
                variant="outlined"
                backgroundColor="transparent"
                color="$color"
                borderColor="$borderColor"
                marginBottom="$6"
              >
                {resolvedNotNowLabel}
              </PrimaryButton>
            </YStack>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
