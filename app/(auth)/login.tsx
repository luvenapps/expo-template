import { useSessionStore } from '@/auth/session';
import { isValidEmail } from '@/data/validation';
import {
  BodyText,
  CaptionText,
  FormField,
  PrimaryButton,
  ScreenContainer,
  SubtitleText,
  TitleText,
  ToastContainer,
  useToast,
} from '@/ui';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Eye, EyeOff } from '@tamagui/lucide-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, TextInput } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button, Card, Form, View, YStack, useThemeName } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const signInWithEmail = useSessionStore((state) => state.signInWithEmail);
  const signInWithOAuth = useSessionStore((state) => state.signInWithOAuth);
  const setError = useSessionStore((state) => state.setError);
  const isLoading = useSessionStore((state) => state.isLoading);
  const error = useSessionStore((state) => state.error);
  const toast = useToast();
  const { t } = useTranslation();

  const isFormValid = email.trim() !== '' && isValidEmail(email) && password.trim() !== '';

  // Clear form fields and error when returning to the screen
  useFocusEffect(
    useCallback(() => {
      // This runs when the screen gains focus (user navigates to it)
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setError(null);
    }, [setError]),
  );

  const handleAuthError = useCallback(
    (rawError: unknown) => {
      const friendlyMessage =
        typeof rawError === 'string'
          ? rawError
          : typeof rawError === 'object' && rawError !== null
            ? t(
                (rawError as { descriptionKey?: string; titleKey?: string }).descriptionKey ??
                  (rawError as { titleKey?: string }).titleKey ??
                  'auth.errorUnknown',
              )
            : t('auth.errorUnknown');

      setError(friendlyMessage);
    },
    [setError, t],
  );

  const handleSubmit = async () => {
    // Prevent submission if form is invalid
    if (!isFormValid) return;

    const result = await signInWithEmail(email, password);
    if (result.success) {
      // Clear fields and error on successful login
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setError(null);

      if (navigation.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } else {
      handleAuthError(result.friendlyError ?? result.error ?? t('auth.errorUnknown'));
    }
  };

  const handleOAuthSignIn = async (provider: 'apple' | 'google') => {
    const result = await signInWithOAuth(provider);
    if (result.success) {
      setError(null);
      if (navigation.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } else {
      handleAuthError(result.friendlyError ?? result.error ?? t('auth.errorUnknown'));
    }
  };

  const themeName = useThemeName();
  const isDarkMode = themeName?.toLowerCase().includes('dark');

  const oauthButtons = useMemo(() => {
    type OAuthButton = {
      provider: 'apple' | 'google';
      label: string;
      icon: ReactNode;
      disabled?: boolean;
      variant: 'apple' | 'google';
      textColor?: string;
      backgroundColor?: string;
      borderColor?: string;
      hoverBackgroundColor?: string;
      hoverBorderColor?: string;
      hoverTextColor?: string;
      buttonHeight?: number;
      fontSize?: number;
      iconSize?: number;
      minWidth?: number;
      horizontalPadding?: number;
      titlePaddingEnd?: number;
      iconPaddingTop?: number;
      iconPaddingBottom?: number;
    };

    const buttons: OAuthButton[] = [];

    if (Platform.OS !== 'android') {
      const appleDark = {
        backgroundColor: '#000000',
        borderColor: '#8E918F',
        textColor: '#FFFFFF',
        hoverBackgroundColor: '#1F1F1F',
        hoverBorderColor: '#E3E3E3',
        hoverTextColor: '#FFFFFF',
      };

      const appleLight = {
        backgroundColor: '#FFFFFF',
        borderColor: '#747775',
        textColor: '#000000',
        hoverBackgroundColor: '#F5F5F5',
        hoverBorderColor: '#1F1F1F',
        hoverTextColor: '#000000',
      };

      buttons.push({
        provider: 'apple',
        label: t('auth.oauth.apple'),
        icon: (
          <Svg width={18} height={18} viewBox="0 0 18 18" role="img">
            <Path
              d="M13.545 9.5c.027 2.381 1.832 3.173 1.855 3.186-.015.048-.291 1.008-.96 1.997-.578.853-1.175 1.703-2.12 1.72-.927.017-1.225-.557-2.287-.557-1.062 0-1.399.54-2.286.574-.915.035-1.612-.919-2.192-1.77-1.191-1.729-2.101-4.887-1.2-7.02.61-1.402 1.707-2.286 3.1-2.304.97-.018 1.881.62 2.286.62.406 0 1.574-.768 2.653-.654.452.018 1.725.183 2.515 1.38-.065.041-1.511.875-1.464 2.828z"
              fill={isDarkMode ? '#FFFFFF' : '#000000'}
            />
            <Path
              d="M11.91 4.063c.483-.589.808-1.41.72-2.23-.697.029-1.547.465-2.052 1.054-.45.52-.842 1.353-.737 2.154.774.06 1.585-.395 2.068-.978z"
              fill={isDarkMode ? '#FFFFFF' : '#000000'}
            />
          </Svg>
        ),
        variant: 'apple',
        ...(isDarkMode ? appleDark : appleLight),
        buttonHeight: 40,
        fontSize: 16,
        iconSize: 18,
        minWidth: 140,
        horizontalPadding: 12,
        titlePaddingEnd: 16,
        iconPaddingTop: 2,
        iconPaddingBottom: 4,
      });
    }

    const googleStyles = isDarkMode
      ? {
          backgroundColor: '#131314',
          borderColor: '#8E918F',
          textColor: '#E3E3E3',
          hoverBackgroundColor: '#1F1F1F',
          hoverBorderColor: '#E3E3E3',
          hoverTextColor: '#FFFFFF',
        }
      : {
          backgroundColor: '#FFFFFF',
          borderColor: '#747775',
          textColor: '#1F1F1F',
          hoverBackgroundColor: '#F6F8F9',
          hoverBorderColor: '#1F1F1F',
          hoverTextColor: '#1F1F1F',
        };

    buttons.push({
      provider: 'google',
      label: t('auth.oauth.google'),
      icon: (
        <Svg width={18} height={18} viewBox="0 0 18 18" role="img">
          <Path
            d="M17.64 9.2045c0-.638-.0573-1.251-.1636-1.836H9v3.474h4.843c-.2087 1.125-.8437 2.078-1.797 2.717v2.258h2.908c1.7025-1.567 2.685-3.874 2.685-6.613z"
            fill="#4285F4"
          />
          <Path
            d="M9 18c2.43 0 4.467-0.806 5.956-2.182l-2.908-2.258c-.807.54-1.84.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332C2.438 15.983 5.481 18 9 18z"
            fill="#34A853"
          />
          <Path
            d="M3.964 10.71c-.183-.54-.287-1.117-.287-1.71s.104-1.17.287-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.347 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <Path
            d="M9 3.542c1.322 0 2.51.455 3.444 1.348l2.583-2.583C13.463.915 11.426 0 9 0 5.481 0 2.438 2.017.957 4.958l3.007 2.332C4.672 5.163 6.656 3.542 9 3.542z"
            fill="#EA4335"
          />
        </Svg>
      ),
      variant: 'google',
      disabled: false,
      ...googleStyles,
      buttonHeight: 40,
      fontSize: 16,
      iconSize: 18,
      minWidth: 140,
      horizontalPadding: 12,
      titlePaddingEnd: 16,
      iconPaddingTop: 0,
      iconPaddingBottom: 0,
    });

    return buttons;
  }, [isDarkMode, t]);

  const content = (
    <ScreenContainer
      alignItems="center"
      paddingHorizontal="$6"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
      }}
    >
      <Card
        bordered
        elevate
        padding="$6"
        width="100%"
        maxWidth={440}
        backgroundColor="$backgroundStrong"
      >
        <YStack gap="$5" width="100%">
          <YStack gap="$2" alignItems="center">
            <TitleText textAlign="center">{t('auth.loginTitle')}</TitleText>
            <SubtitleText textAlign="center">{t('auth.loginSubtitle')}</SubtitleText>
          </YStack>

          <Form onSubmit={handleSubmit} width="100%" gap="$4">
            <FormField
              testID="email-field"
              labelTestID="email-label"
              inputTestID="email-input"
              label={t('auth.emailLabel')}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor="$colorMuted"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={() => passwordInputRef.current?.focus?.()}
              returnKeyType="next"
            />

            <FormField
              ref={passwordInputRef}
              testID="password-field"
              labelTestID="password-label"
              inputTestID="password-input"
              label={t('auth.passwordLabel')}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor="$colorMuted"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              paddingRight="$10"
              rightElement={
                <View
                  position="absolute"
                  right="$0"
                  padding="$1"
                  testID="toggle-password-visibility"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hoverStyle={{ opacity: 0.7, cursor: 'pointer' }}
                  pressStyle={{ opacity: 0.5 }}
                  role="button"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="$colorMuted" />
                  ) : (
                    <Eye size={20} color="$colorMuted" />
                  )}
                </View>
              }
            />

            <CaptionText
              testID="forgot-password-link"
              textAlign="right"
              color="$accentColor"
              fontWeight="600"
              onPress={() => router.push('/(auth)/forgot-password')}
              hoverStyle={{ opacity: 0.8, cursor: 'pointer' }}
            >
              {t('auth.forgotPasswordLink')}
            </CaptionText>

            {error ? (
              <YStack
                testID="error-message"
                padding="$3"
                backgroundColor="$dangerBackground"
                borderRadius="$3"
                borderWidth={1}
                borderColor="$dangerColor"
              >
                <BodyText color="$dangerColor" textAlign="center" fontSize="$3">
                  {error}
                </BodyText>
              </YStack>
            ) : null}

            <Form.Trigger asChild>
              <PrimaryButton
                testID="sign-in-button"
                disabled={!isFormValid || isLoading}
                onPress={handleSubmit}
              >
                {isLoading ? t('auth.signingIn') : t('auth.signIn')}
              </PrimaryButton>
            </Form.Trigger>
          </Form>

          <YStack
            gap="$2"
            width="100%"
            alignItems="center"
            marginTop={Platform.OS === 'web' ? '$4' : '$5'}
          >
            <CaptionText color="$colorMuted">{t('auth.noAccountPrompt')}</CaptionText>
            <PrimaryButton
              testID="create-account-button"
              width="100%"
              onPress={() => router.push('/(auth)/signup')}
            >
              {t('auth.createAccountCta')}
            </PrimaryButton>
          </YStack>

          <YStack gap="$3" width="100%" alignItems="center">
            <View marginTop={Platform.OS === 'web' ? 0 : 10}>
              <CaptionText color="$colorMuted">{t('auth.oauthDivider')}</CaptionText>
            </View>
            {oauthButtons.map(
              ({
                provider,
                label,
                icon,
                disabled,
                backgroundColor,
                borderColor,
                textColor,
                hoverBackgroundColor,
                hoverBorderColor,
                hoverTextColor,
                buttonHeight,
                fontSize,
                iconSize,
                minWidth,
                horizontalPadding,
                titlePaddingEnd,
                iconPaddingTop,
                iconPaddingBottom,
              }) => (
                <Button
                  key={provider}
                  testID={`oauth-${provider}-button`}
                  flex={1}
                  width="100%"
                  minWidth={minWidth}
                  height={buttonHeight ?? 40}
                  paddingHorizontal={horizontalPadding ?? 12}
                  backgroundColor={backgroundColor ?? '$surface'}
                  borderRadius="$2"
                  borderWidth={1}
                  borderColor={borderColor ?? '$borderColor'}
                  color={textColor ?? '$color'}
                  disabled={disabled || isLoading}
                  aria-label={`oauth-${provider}`}
                  hoverStyle={{
                    backgroundColor: hoverBackgroundColor ?? backgroundColor ?? '$surface',
                    borderColor: hoverBorderColor ?? borderColor ?? '#1F1F1F',
                    shadowColor: 'rgba(60, 64, 67, 0.3)',
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 1,
                  }}
                  pressStyle={{
                    opacity: 0.9,
                  }}
                  disabledStyle={{
                    opacity: 0.5,
                  }}
                  onPress={() => {
                    void handleOAuthSignIn(provider);
                  }}
                >
                  <View
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="center"
                    gap="$2"
                    width="100%"
                  >
                    <View
                      width={iconSize ?? 20}
                      height={buttonHeight ?? 40}
                      alignItems="center"
                      justifyContent="center"
                      paddingTop={iconPaddingTop ?? 0}
                      paddingBottom={iconPaddingBottom ?? 0}
                    >
                      {icon}
                    </View>
                    <BodyText
                      color={textColor ?? '$color'}
                      fontWeight="600"
                      fontSize={fontSize ?? 16}
                      flexShrink={1}
                      paddingRight={titlePaddingEnd ?? 16}
                      hoverStyle={{
                        color: hoverTextColor ?? textColor ?? '$color',
                      }}
                    >
                      {label}
                    </BodyText>
                  </View>
                </Button>
              ),
            )}
          </YStack>
        </YStack>
      </Card>
    </ScreenContainer>
  );

  return (
    <>
      {content}
      <ToastContainer messages={toast.messages} dismiss={toast.dismiss} />
    </>
  );
}
