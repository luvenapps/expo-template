import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import Constants from 'expo-constants';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';
import { Button, Dialog, Paragraph, XStack, YStack } from 'tamagui';
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

    const iosDeepLink = iosAppId
      ? `itms-apps://apps.apple.com/app/id${iosAppId}`
      : 'itms-apps://apps.apple.com/';
    const iosWebLink = iosAppId
      ? `https://apps.apple.com/app/id${iosAppId}`
      : 'https://apps.apple.com/';
    const androidDeepLink = androidPackage
      ? `market://details?id=${androidPackage}`
      : 'https://play.google.com/store';
    const androidWebLink = androidPackage
      ? `https://play.google.com/store/apps/details?id=${androidPackage}`
      : 'https://play.google.com/store';

    return {
      ios: [iosDeepLink, iosWebLink],
      android: [androidDeepLink, androidWebLink],
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
          gap="$4"
        >
          <YStack gap="$3">
            <Dialog.Title asChild>
              <Paragraph fontSize="$5" fontWeight="700">
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
          <XStack gap="$3" justifyContent="flex-end">
            <Button
              flex={1}
              onPress={handleNotNowPress}
              testID="prompt-upgrade-not-now"
              backgroundColor="$colorTransparent"
            >
              {notNowLabel}
            </Button>
            <PrimaryButton flex={1} onPress={handleUpdatePressSafe} testID="prompt-upgrade-action">
              {actionLabel}
            </PrimaryButton>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
