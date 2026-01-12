import { supabase } from '@/auth/client';
import { useSessionStore } from '@/auth/session';
import { isValidEmail } from '@/data/validation';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { FormField, InlineError, PrimaryButton, ScreenContainer, SecondaryButton } from '@/ui';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paragraph, XStack, YStack } from 'tamagui';

type UpdatePayload = {
  email?: string;
  data?: {
    full_name?: string;
    phone_number?: string;
  };
};

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const session = useSessionStore((state) => state.session);
  const status = useSessionStore((state) => state.status);
  const setSession = useSessionStore((state) => state.setSession);
  const handleError = useFriendlyErrorHandler();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const profileName = useMemo(() => {
    const metadata = session?.user?.user_metadata as { full_name?: string; name?: string } | null;
    return metadata?.full_name ?? metadata?.name ?? '';
  }, [session?.user?.user_metadata]);

  const profileEmail = useMemo(() => session?.user?.email ?? '', [session?.user?.email]);
  const profilePhone = useMemo(() => {
    const metadata = session?.user?.user_metadata as { phone_number?: string } | null;
    return session?.user?.phone ?? metadata?.phone_number ?? '';
  }, [session?.user?.phone, session?.user?.user_metadata]);
  const isEmailProvider = useMemo(() => {
    const appMetadata = session?.user?.app_metadata as {
      provider?: string;
      providers?: string[];
    } | null;
    const provider = appMetadata?.provider;
    const providers = appMetadata?.providers ?? [];
    return provider === 'email' || providers.includes('email');
  }, [session?.user?.app_metadata]);

  useEffect(() => {
    setName(profileName);
    setEmail(profileEmail);
    setPhoneNumber(profilePhone);
  }, [profileName, profileEmail, profilePhone]);

  const resolveErrorMessage = useCallback(
    (friendly: { description?: string; descriptionKey?: string }) => {
      if (friendly.description) return friendly.description;
      if (friendly.descriptionKey) return t(friendly.descriptionKey);
      return t('errors.unknown.description');
    },
    [t],
  );

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();

    if (isEmailProvider) {
      if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
        setErrorMessage(t('settings.profileEmailInvalid'));
        return;
      }
    }

    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      setErrorMessage(t('settings.profilePhoneInvalid'));
      return;
    }

    if (!session?.user) {
      setErrorMessage(t('settings.profileSignInRequired'));
      return;
    }

    const updates: UpdatePayload = {};
    if (trimmedName !== profileName.trim()) {
      updates.data = { full_name: trimmedName };
    }
    if (isEmailProvider && trimmedEmail !== profileEmail) {
      updates.email = trimmedEmail;
    }
    if (trimmedPhone !== profilePhone) {
      updates.data = {
        ...(updates.data ?? {}),
        phone_number: trimmedPhone,
      };
    }

    if (!updates.email && !updates.data) {
      setStatusMessage(t('settings.profileNoChanges'));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser(updates);
      if (error) {
        throw error;
      }
      const {
        data: { session: updatedSession },
      } = await supabase.auth.getSession();
      setSession(updatedSession);
      setStatusMessage(t('settings.profileSaved'));
    } catch (error) {
      const { friendly } = handleError(error, {
        surface: 'settings.profile',
        suppressToast: true,
      });
      setErrorMessage(resolveErrorMessage(friendly));
    } finally {
      setIsSaving(false);
    }
  }, [
    email,
    handleError,
    isEmailProvider,
    name,
    phoneNumber,
    profileEmail,
    profileName,
    profilePhone,
    resolveErrorMessage,
    session?.user,
    setSession,
    t,
  ]);

  if (status !== 'authenticated') {
    return (
      <ScreenContainer contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}>
        <YStack gap="$4" alignItems="center" justifyContent="center" flex={1}>
          <Paragraph fontSize="$5" fontWeight="700">
            {t('settings.profileTitle')}
          </Paragraph>
          <Paragraph color="$colorMuted" textAlign="center">
            {t('settings.profileSignInRequired')}
          </Paragraph>
          <SecondaryButton onPress={() => router.push('/(auth)/login')}>
            {t('settings.signIn')}
          </SecondaryButton>
        </YStack>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}>
      <YStack gap="$4">
        <YStack gap="$2">
          <Paragraph fontSize="$5" fontWeight="700">
            {t('settings.profileTitle')}
          </Paragraph>
          <Paragraph color="$colorMuted">{t('settings.profileDescription')}</Paragraph>
        </YStack>

        <FormField
          label={t('settings.profileNameLabel')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          inputTestID="profile-name-input"
        />
        <FormField
          label={t('settings.profileEmailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          helperText={
            isEmailProvider ? t('settings.profileEmailHelper') : t('settings.profileEmailManaged')
          }
          editable={isEmailProvider}
          inputTestID="profile-email-input"
        />
        <FormField
          label={t('settings.profilePhoneLabel')}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          autoCapitalize="none"
          autoComplete="tel"
          keyboardType="phone-pad"
          helperText={t('settings.profilePhoneHelper')}
          inputTestID="profile-phone-input"
        />

        <InlineError message={errorMessage} testID="profile-error" />
        {statusMessage ? (
          <Paragraph color="$colorMuted" textAlign="center" testID="profile-status">
            {statusMessage}
          </Paragraph>
        ) : null}

        <XStack gap="$3" paddingTop="$2">
          <SecondaryButton flex={1} onPress={() => router.back()} disabled={isSaving}>
            {t('settings.profileCancel')}
          </SecondaryButton>
          <PrimaryButton flex={1} onPress={handleSave} disabled={isSaving}>
            {isSaving ? t('settings.profileSaving') : t('settings.profileSave')}
          </PrimaryButton>
        </XStack>
      </YStack>
    </ScreenContainer>
  );
}
