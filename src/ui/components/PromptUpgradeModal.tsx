import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import Constants from 'expo-constants';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, useWindowDimensions } from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { Dialog, Paragraph, useTheme, XStack, YStack } from 'tamagui';
import { PrimaryButton } from './PrimaryButton';

type PromptUpgradeModalProps = {
  open: boolean;
  title: string;
  message: string;
  actionLabel: string;
  notNowLabel: string;
  onNotNow: () => void;
};

export function PromptUpgradeModal({
  open,
  title,
  message,
  actionLabel,
  notNowLabel,
  onNotNow,
}: PromptUpgradeModalProps) {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleError = useFriendlyErrorHandler();
  const allowCloseRef = useRef(false);
  const theme = useTheme();
  const strokeColor = theme.color?.get() ?? '#111';
  const { width, height: windowHeight } = useWindowDimensions();
  const size = width < 390 ? 300 : 500;
  const isWeb = Platform.OS === 'web';
  const dialogHeight = isWeb ? windowHeight * 0.88 : windowHeight * 0.85;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen || !allowCloseRef.current) {
      return;
    }

    allowCloseRef.current = false;
    onNotNow();
  };

  const storeUrls = useMemo(() => {
    const storeIds = Constants.expoConfig?.extra?.storeIds ?? {};
    const androidPackage = typeof storeIds.android === 'string' ? storeIds.android : '';
    const iosAppId = typeof storeIds.ios === 'string' ? storeIds.ios : '';

    return {
      ios: iosAppId
        ? [
            `itms-apps://apps.apple.com/app/id${iosAppId}`,
            `https://apps.apple.com/app/id${iosAppId}`,
          ]
        : ['itms-apps://apps.apple.com/', 'https://apps.apple.com/'],
      android: androidPackage
        ? [
            `market://details?id=${androidPackage}`,
            `https://play.google.com/store/apps/details?id=${androidPackage}`,
          ]
        : ['https://play.google.com/store'],
    };
  }, []);

  const handleUpdatePress = useCallback(async () => {
    setErrorMessage(null);

    const candidateUrls = Platform.OS === 'ios' ? storeUrls.ios : storeUrls.android;

    for (const url of candidateUrls) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return;
        }
      } catch {
        continue;
      }
    }

    throw new Error('Unable to open the app store link.');
  }, [storeUrls]);

  const handleUpdatePressSafe = useCallback(() => {
    handleUpdatePress().catch((error) => {
      const { friendly } = handleError(error, { surface: 'prompt-upgrade' });
      const titleText =
        friendly.title ?? (friendly.titleKey ? t(friendly.titleKey) : t('errors.unknown.title'));
      const descriptionText =
        friendly.description ??
        (friendly.descriptionKey ? t(friendly.descriptionKey) : (friendly.originalMessage ?? ''));

      setErrorMessage(descriptionText || titleText);
    });
  }, [handleError, handleUpdatePress, t]);

  const handleNotNowPress = () => {
    allowCloseRef.current = true;
    onNotNow();
  };

  return (
    <Dialog modal open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay key="prompt-upgrade-overlay" />
        <Dialog.Content
          key="prompt-upgrade-content"
          bordered
          elevate
          padding="$4"
          alignSelf="center"
          width="100%"
          maxWidth={480}
          height={dialogHeight}
          gap="$4"
        >
          <YStack gap="$4" flex={1} justifyContent="space-between">
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
              {errorMessage ? (
                <Paragraph fontSize="$3" color="$red10" testID="prompt-upgrade-error">
                  {errorMessage}
                </Paragraph>
              ) : null}
            </YStack>
            <XStack justifyContent="center" flex={1} alignItems="center">
              <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
                {/* Smartphone Frame */}
                <Rect
                  x="125.48"
                  y="31.37"
                  width="261.04"
                  height="449.25"
                  rx="36.57"
                  stroke={strokeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Top Speaker Detail */}
                <Path
                  d="M232.09,73.17h47.82"
                  stroke={strokeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Centered Update Symbol Group */}
                <G transform="translate(256, 256)">
                  {/* Upper Arc */}
                  <Path
                    d="M65.4,-30.1 A72,72 0 0,0 -65.4,-30.1"
                    stroke={strokeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Top Arrowhead (Centered on line tip) */}
                  <Path
                    d="M-78.5,-58.5 l13.1,30.4 l35.5,-4.5"
                    stroke={strokeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Lower Arc */}
                  <Path
                    d="M-65.4,30.1 A72,72 0 0,0 65.4,30.1"
                    stroke={strokeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Bottom Arrowhead (Centered on line tip) */}
                  <Path
                    d="M78.5,58.5 l-13.1,-30.4 l-35.5,4.5"
                    stroke={strokeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </G>
              </Svg>
            </XStack>
            <XStack gap="$4" justifyContent="center">
              <PrimaryButton
                flex={1}
                onPress={handleNotNowPress}
                testID="prompt-upgrade-not-now"
                aria-label="prompt-upgrade-not-now"
                variant="outlined"
                backgroundColor="transparent"
                color="$color"
                borderColor="$borderColor"
              >
                {notNowLabel}
              </PrimaryButton>
              <PrimaryButton
                flex={1}
                onPress={handleUpdatePressSafe}
                testID="prompt-upgrade-action"
                aria-label="prompt-upgrade-action"
              >
                {actionLabel}
              </PrimaryButton>
            </XStack>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
