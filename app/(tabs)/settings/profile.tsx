import { supabase } from '@/auth/client';
import { useSessionStore } from '@/auth/session';
import { isValidEmail } from '@/data/validation';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import {
  FormField,
  InlineError,
  PrimaryButton,
  ScreenContainer,
  SecondaryButton,
  UserOnly,
} from '@/ui';
import { Stack, useRouter } from 'expo-router';
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js/min';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paragraph, XStack, YStack } from 'tamagui';

type UpdatePayload = {
  email?: string;
  data?: {
    full_name?: string;
    phone_number?: string;
  };
};

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const handleError = useFriendlyErrorHandler();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const hasHydratedRef = useRef(false);

  const profileName = useMemo(() => {
    const metadata = session?.user?.user_metadata as { full_name?: string; name?: string } | null;
    return metadata?.full_name ?? metadata?.name ?? '';
  }, [session?.user?.user_metadata]);

  const profileEmail = useMemo(() => session?.user?.email ?? '', [session?.user?.email]);
  const profilePhone = useMemo(() => {
    const metadata = session?.user?.user_metadata as { phone_number?: string } | null;
    const phoneValue = session?.user?.phone;
    if (typeof phoneValue === 'string' && phoneValue.trim().length > 0) {
      return phoneValue;
    }
    return metadata?.phone_number ?? '';
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
    // Format phone number on initialization
    if (profilePhone) {
      const cleaned = profilePhone.replace(/[^\d+]/g, '');
      const formatter = cleaned.startsWith('+') ? new AsYouType() : new AsYouType('US');
      setPhoneNumber(formatter.input(cleaned));
    } else {
      setPhoneNumber('');
    }
    setEmailTouched(false);
    setEmailError(null);
  }, [profileName, profileEmail, profilePhone]);

  const hydrateFromUser = useCallback(
    (user: {
      email?: string | null;
      phone?: string | null;
      user_metadata?: Record<string, unknown> | null;
    }) => {
      const metadata = user.user_metadata as {
        full_name?: string;
        name?: string;
        phone_number?: string;
      } | null;
      const nextName = metadata?.full_name ?? metadata?.name ?? '';
      const nextEmail = user.email ?? '';
      const phoneValue =
        typeof user.phone === 'string' && user.phone.trim().length > 0
          ? user.phone
          : (metadata?.phone_number ?? '');
      if (nextName !== name) setName(nextName);
      if (nextEmail !== email) setEmail(nextEmail);
      if (phoneValue) {
        const cleaned = phoneValue.replace(/[^\d+]/g, '');
        const formatter = cleaned.startsWith('+') ? new AsYouType() : new AsYouType('US');
        setPhoneNumber(formatter.input(cleaned));
      } else {
        setPhoneNumber('');
      }
    },
    [email, name],
  );

  const refreshUserProfile = useCallback(async () => {
    if (hasHydratedRef.current) return;
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      handleError(error, { surface: 'settings.profile', suppressToast: true });
      return;
    }
    if (!data.user) return;
    if (session) {
      setSession({ ...session, user: data.user });
    }
    hydrateFromUser(data.user);
    hasHydratedRef.current = true;
  }, [handleError, hydrateFromUser, session, setSession]);

  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  const resolveErrorMessage = useCallback(
    (friendly: { description?: string; descriptionKey?: string }) => {
      if (friendly.description) return friendly.description;
      if (friendly.descriptionKey) return t(friendly.descriptionKey);
      return t('errors.unknown.description');
    },
    [t],
  );

  const validateEmail = useCallback(
    (nextEmail: string) => {
      if (!isEmailProvider) {
        setEmailError(null);
        return;
      }
      const trimmed = nextEmail.trim();
      if (!trimmed) {
        setEmailError(t('settings.profileEmailInvalid'));
        return;
      }
      setEmailError(isValidEmail(trimmed) ? null : t('settings.profileEmailInvalid'));
    },
    [isEmailProvider, t],
  );

  const handlePhoneChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^\d+]/g, '');
    if (!cleaned) {
      setPhoneNumber('');
      return;
    }

    const formatter = cleaned.startsWith('+') ? new AsYouType() : new AsYouType('US');
    setPhoneNumber(formatter.input(cleaned));
  }, []);

  const normalizePhoneNumber = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    // Remove formatting characters (spaces, dashes, parentheses)
    const cleaned = trimmed.replace(/[\s\-()]/g, '');
    const parsed = cleaned.startsWith('+')
      ? parsePhoneNumberFromString(cleaned)
      : parsePhoneNumberFromString(cleaned, 'US');
    // Return E.164 format if parsing succeeds, empty string if it fails
    return parsed?.number ?? '';
  }, []);

  const handleSave = useCallback(async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();

    if (isEmailProvider) {
      if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
        setEmailTouched(true);
        setEmailError(t('settings.profileEmailInvalid'));
        return;
      }
    }

    if (trimmedPhone) {
      // Remove formatting before validation
      const cleanedPhone = trimmedPhone.replace(/[\s\-()]/g, '');
      const parsedPhone = cleanedPhone.startsWith('+')
        ? parsePhoneNumberFromString(cleanedPhone)
        : parsePhoneNumberFromString(cleanedPhone, 'US');
      if (!parsedPhone?.isValid()) {
        setErrorMessage(t('settings.profilePhoneInvalid'));
        return;
      }
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
    const normalizedPhone = normalizePhoneNumber(trimmedPhone);
    const normalizedProfilePhone = normalizePhoneNumber(profilePhone);
    if (normalizedPhone !== normalizedProfilePhone) {
      updates.data = {
        ...(updates.data ?? {}),
        phone_number: normalizedPhone,
      };
    }

    if (!updates.email && !updates.data) {
      setStatusMessage(t('settings.profileNoChanges'));
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user: updatedUser },
        error,
      } = await supabase.auth.updateUser(updates);
      if (error) {
        throw error;
      }
      const {
        data: { session: updatedSession },
      } = await supabase.auth.getSession();
      if (updatedSession && updatedUser) {
        setSession({ ...updatedSession, user: updatedUser });
      } else {
        setSession(updatedSession ?? session ?? null);
      }
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
    normalizePhoneNumber,
    phoneNumber,
    profileEmail,
    profileName,
    profilePhone,
    resolveErrorMessage,
    session,
    setSession,
    t,
  ]);

  return (
    <UserOnly>
      <ScreenContainer contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}>
        <Stack.Screen options={{ title: t('settings.profileTitle') }} />
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
            onChangeText={(value) => {
              setEmail(value);
              if (emailTouched) {
                validateEmail(value);
              }
            }}
            onBlur={() => {
              setEmailTouched(true);
              validateEmail(email);
            }}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            helperText={
              isEmailProvider ? t('settings.profileEmailHelper') : t('settings.profileEmailManaged')
            }
            editable={isEmailProvider}
            errorText={isEmailProvider ? (emailError ?? undefined) : undefined}
            borderColor={isEmailProvider && emailError ? '$dangerColor' : undefined}
            focusStyle={isEmailProvider && emailError ? { borderColor: '$dangerColor' } : undefined}
            inputTestID="profile-email-input"
          />
          <FormField
            label={t('settings.profilePhoneLabel')}
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            autoCapitalize="none"
            autoComplete="tel"
            keyboardType="phone-pad"
            inputTestID="profile-phone-input"
          />

          <InlineError message={errorMessage} testID="profile-error" />
          {statusMessage ? (
            <Paragraph color="$colorMuted" textAlign="center" testID="profile-status">
              {statusMessage}
            </Paragraph>
          ) : null}

          <XStack gap="$3" paddingTop="$2">
            <SecondaryButton
              size="$4"
              width="auto"
              flex={1}
              onPress={() => router.back()}
              disabled={isSaving}
            >
              {t('settings.profileCancel')}
            </SecondaryButton>
            <PrimaryButton size="$4" width="auto" flex={1} onPress={handleSave} disabled={isSaving}>
              {isSaving ? t('settings.profileSaving') : t('settings.profileSave')}
            </PrimaryButton>
          </XStack>
        </YStack>
      </ScreenContainer>
    </UserOnly>
  );
}
