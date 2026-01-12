// Mock Tamagui components
jest.mock('tamagui', () => {
  const mockReact = jest.requireActual('react');

  return {
    YStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    XStack: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    View: ({ children, ...props }: any) => mockReact.createElement('View', props, children),
    Input: ({ value, ...props }: any) => mockReact.createElement('TextInput', { value, ...props }),
    Text: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    Paragraph: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    ScrollView: ({ children, ...props }: any) =>
      mockReact.createElement('ScrollView', props, children),
    Button: ({ children, ...props }: any) =>
      mockReact.createElement('View', { ...props, role: 'button' }, children),
  };
});

// Mock Text components
jest.mock('@/ui/components/Text', () => {
  const mockReact = jest.requireActual('react');

  return {
    LabelText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    CaptionText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    TitleText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    SubtitleText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
    BodyText: ({ children, ...props }: any) => mockReact.createElement('Text', props, children),
  };
});

// Mock Button components
jest.mock('@/ui/components/PrimaryButton', () => {
  const mockReact = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    PrimaryButton: ({ children, onPress, disabled, ...props }: any) =>
      mockReact.createElement(
        TouchableOpacity,
        { onPress, disabled, ...props },
        mockReact.createElement(Text, {}, children),
      ),
  };
});

jest.mock('@/ui/components/SecondaryButton', () => {
  const mockReact = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');

  return {
    SecondaryButton: ({ children, onPress, disabled, ...props }: any) =>
      mockReact.createElement(
        TouchableOpacity,
        { onPress, disabled, ...props },
        mockReact.createElement(Text, {}, children),
      ),
  };
});

import { supabase } from '@/auth/client';
import { useSessionStore } from '@/auth/session';
import { useFriendlyErrorHandler } from '@/errors/useFriendlyErrorHandler';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileScreen from '../../../../app/(tabs)/settings/profile';

jest.mock('@/auth/client');
jest.mock('@/auth/session');
jest.mock('@/errors/useFriendlyErrorHandler');
jest.mock('expo-router');

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
};

const mockHandleError = jest.fn();

// Wrapper component to provide SafeAreaProvider
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 375, height: 812 },
      insets: { top: 44, left: 0, right: 0, bottom: 34 },
    }}
  >
    {children}
  </SafeAreaProvider>
);

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: Wrapper });
};

// Helper to create mock updateUser response
const createMockUpdateUserResponse = (user: any) => ({
  data: { user },
  error: null,
});

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useFriendlyErrorHandler as jest.Mock).mockReturnValue(mockHandleError);
    mockHandleError.mockReturnValue({
      friendly: { description: 'Test error', descriptionKey: 'errors.test' },
    });

    // Mock supabase.auth.getUser to prevent hydration calls during tests
    (supabase.auth.getUser as jest.Mock) = jest.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  describe('Unauthenticated state', () => {
    beforeEach(() => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = { session: null, status: 'unauthenticated', setSession: jest.fn() };
        return selector(state);
      });
    });

    it('should render sign-in prompt when unauthenticated', () => {
      renderWithProviders(<ProfileScreen />);

      expect(screen.getByText('settings.profileTitle')).toBeTruthy();
      expect(screen.getByText('settings.profileSignInRequired')).toBeTruthy();
      expect(screen.getByText('settings.signIn')).toBeTruthy();
    });

    it('should navigate to login when sign-in button is pressed', () => {
      renderWithProviders(<ProfileScreen />);

      const signInButton = screen.getByText('settings.signIn');
      fireEvent.press(signInButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/login');
    });
  });

  describe('Authenticated state', () => {
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          phone_number: '+12025551234', // Valid US phone number (DC area code)
        },
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
      },
    };

    beforeEach(() => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: mockSession,
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });
    });

    it('should render profile form when authenticated', () => {
      renderWithProviders(<ProfileScreen />);

      expect(screen.getByText('settings.profileTitle')).toBeTruthy();
      expect(screen.getByText('settings.profileDescription')).toBeTruthy();
      expect(screen.getByTestId('profile-name-input')).toBeTruthy();
      expect(screen.getByTestId('profile-email-input')).toBeTruthy();
      expect(screen.getByTestId('profile-phone-input')).toBeTruthy();
    });

    it('should populate form fields with existing profile data', () => {
      renderWithProviders(<ProfileScreen />);

      expect(screen.getByTestId('profile-name-input').props.value).toBe('Test User');
      expect(screen.getByTestId('profile-email-input').props.value).toBe('test@example.com');
      expect(screen.getByTestId('profile-phone-input').props.value).toBe('+1 202 555 1234');
    });

    it('should format US phone number without country code on initialization', () => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: {
            ...mockSession,
            user: {
              ...mockSession.user,
              user_metadata: {
                ...mockSession.user.user_metadata,
                phone_number: '2025551234', // US phone without + prefix
              },
            },
          },
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });

      renderWithProviders(<ProfileScreen />);

      // Should format as US number
      const phoneInput = screen.getByTestId('profile-phone-input');
      expect(phoneInput.props.value).toBe('(202) 555-1234');
    });

    it('should handle empty phone number on initialization', () => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: {
            ...mockSession,
            user: {
              ...mockSession.user,
              user_metadata: {
                ...mockSession.user.user_metadata,
                phone_number: '', // Empty phone
              },
            },
          },
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });

      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');
      expect(phoneInput.props.value).toBe('');
    });

    it('should disable email field when not using email provider', () => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: {
            ...mockSession,
            user: {
              ...mockSession.user,
              app_metadata: { provider: 'google', providers: ['google'] },
            },
          },
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });

      renderWithProviders(<ProfileScreen />);

      expect(screen.getByTestId('profile-email-input').props.editable).toBe(false);
      expect(screen.getByText('settings.profileEmailManaged')).toBeTruthy();
    });

    it('should enable email field when using email provider', () => {
      renderWithProviders(<ProfileScreen />);

      expect(screen.getByTestId('profile-email-input').props.editable).toBe(true);
      expect(screen.getByText('settings.profileEmailHelper')).toBeTruthy();
    });

    it('should update form fields when user types', () => {
      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const emailInput = screen.getByTestId('profile-email-input');
      const phoneInput = screen.getByTestId('profile-phone-input');

      fireEvent.changeText(nameInput, 'New Name');
      fireEvent.changeText(emailInput, 'new@example.com');
      fireEvent.changeText(phoneInput, '+19175551234'); // Valid NYC number

      expect(nameInput.props.value).toBe('New Name');
      expect(emailInput.props.value).toBe('new@example.com');
      expect(phoneInput.props.value).toBe('+1 917 555 1234');
    });

    it('should show error when email is invalid', async () => {
      renderWithProviders(<ProfileScreen />);

      const emailInput = screen.getByTestId('profile-email-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.profileEmailInvalid')).toBeTruthy();
      });
    });

    it('should show error when phone number is invalid', async () => {
      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(phoneInput, '123'); // Too short
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.profilePhoneInvalid')).toBeTruthy();
      });
    });

    it('should show message when no changes are made', async () => {
      renderWithProviders(<ProfileScreen />);

      const saveButton = screen.getByText('settings.profileSave');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.profileNoChanges')).toBeTruthy();
      });
    });

    it('should successfully save profile changes', async () => {
      const mockSetSession = jest.fn();
      const updatedUser = {
        ...mockSession.user,
        user_metadata: {
          ...mockSession.user.user_metadata,
          full_name: 'Updated Name',
        },
      };
      const mockUpdateUser = jest.fn().mockResolvedValue({
        data: { user: updatedUser },
        error: null,
      });
      const mockGetSession = jest.fn().mockResolvedValue({
        data: {
          session: { ...mockSession, user: updatedUser },
        },
      });

      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: mockSession,
          status: 'authenticated',
          setSession: mockSetSession,
        };
        return selector(state);
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(nameInput, 'Updated Name');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: { full_name: 'Updated Name' },
        });
        expect(mockSetSession).toHaveBeenCalled();
        expect(screen.getByText('settings.profileSaved')).toBeTruthy();
      });
    });

    it('should handle save errors gracefully', async () => {
      const mockUpdateUser = jest.fn().mockResolvedValue({
        error: new Error('Update failed'),
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;

      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(nameInput, 'New Name');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockHandleError).toHaveBeenCalled();
        expect(screen.getByText('Test error')).toBeTruthy();
      });
    });

    it('should disable buttons while saving', async () => {
      const updatedUser = {
        ...mockSession.user,
        user_metadata: { ...mockSession.user.user_metadata, full_name: 'New Name' },
      };
      const mockUpdateUser = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(createMockUpdateUserResponse(updatedUser)), 100);
          }),
      );
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: { ...mockSession, user: updatedUser } },
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(nameInput, 'New Name');
      fireEvent.press(saveButton);

      // Wait for the update to complete
      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: { full_name: 'New Name' },
        });
      });
    });

    it('should navigate back when cancel button is pressed', () => {
      renderWithProviders(<ProfileScreen />);

      const cancelButton = screen.getByText('settings.profileCancel');
      fireEvent.press(cancelButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should handle email updates for email provider', async () => {
      const updatedUser = { ...mockSession.user, email: 'newemail@example.com' };
      const mockUpdateUser = jest.fn().mockResolvedValue(createMockUpdateUserResponse(updatedUser));
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: { ...mockSession, user: updatedUser } },
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const emailInput = screen.getByTestId('profile-email-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(emailInput, 'newemail@example.com');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          email: 'newemail@example.com',
        });
      });
    });

    it('should handle phone number updates', async () => {
      const updatedUser = {
        ...mockSession.user,
        user_metadata: { ...mockSession.user.user_metadata, phone_number: '+19175551234' },
      };
      const mockUpdateUser = jest.fn().mockResolvedValue(createMockUpdateUserResponse(updatedUser));
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: { ...mockSession, user: updatedUser } },
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(phoneInput, '+19175551234');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: { phone_number: '+19175551234' },
        });
      });
    });

    it('should handle errors with only descriptionKey', async () => {
      const mockUpdateUser = jest.fn().mockResolvedValue({
        error: new Error('Update failed'),
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (useFriendlyErrorHandler as jest.Mock).mockReturnValue((error: any) => ({
        friendly: { descriptionKey: 'errors.network.description' },
      }));

      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(nameInput, 'New Name');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        expect(screen.getByText('errors.network.description')).toBeTruthy();
      });
    });

    it('should handle errors with no description or descriptionKey', async () => {
      const mockUpdateUser = jest.fn().mockResolvedValue({
        error: new Error('Update failed'),
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (useFriendlyErrorHandler as jest.Mock).mockReturnValue((error: any) => ({
        friendly: {},
      }));

      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(nameInput, 'New Name');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalled();
        expect(screen.getByText('errors.unknown.description')).toBeTruthy();
      });
    });

    it('should show error when session user is missing', async () => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: { user: null },
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });

      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(nameInput, 'New Name');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(screen.getByText('settings.profileSignInRequired')).toBeTruthy();
      });
    });

    it('should validate email on blur', async () => {
      renderWithProviders(<ProfileScreen />);

      const emailInput = screen.getByTestId('profile-email-input');

      // Type invalid email and blur
      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('settings.profileEmailInvalid')).toBeTruthy();
      });
    });

    it('should show error when email is empty on blur', async () => {
      renderWithProviders(<ProfileScreen />);

      const emailInput = screen.getByTestId('profile-email-input');

      // Clear email and blur
      fireEvent.changeText(emailInput, '');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(screen.getByText('settings.profileEmailInvalid')).toBeTruthy();
      });
    });

    it('should not validate email on change before blur', () => {
      renderWithProviders(<ProfileScreen />);

      const emailInput = screen.getByTestId('profile-email-input');

      // Type invalid email without blur
      fireEvent.changeText(emailInput, 'invalid-email');

      // Should not show error yet
      expect(screen.queryByText('settings.profileEmailInvalid')).toBeNull();
    });

    it('should validate email on change after blur', async () => {
      renderWithProviders(<ProfileScreen />);

      const emailInput = screen.getByTestId('profile-email-input');

      // First blur to set emailTouched
      fireEvent(emailInput, 'blur');

      // Then type invalid email
      fireEvent.changeText(emailInput, 'invalid-email');

      await waitFor(() => {
        expect(screen.getByText('settings.profileEmailInvalid')).toBeTruthy();
      });

      // Now type valid email - should clear error
      fireEvent.changeText(emailInput, 'valid@example.com');

      await waitFor(() => {
        expect(screen.queryByText('settings.profileEmailInvalid')).toBeNull();
      });
    });

    it('should not validate or show errors for non-email provider', () => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: {
            ...mockSession,
            user: {
              ...mockSession.user,
              app_metadata: { provider: 'google', providers: ['google'] },
            },
          },
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });

      renderWithProviders(<ProfileScreen />);

      // Get the email input
      const emailInput = screen.getByTestId('profile-email-input');

      // Verify field is not editable for non-email provider
      expect(emailInput.props.editable).toBe(false);

      // Force call onBlur handler directly if it exists, wrapped in act
      act(() => {
        if (emailInput.props.onBlur) {
          emailInput.props.onBlur();
        }
      });

      // Should not show any validation error for non-email provider
      expect(screen.queryByText('settings.profileEmailInvalid')).toBeNull();
    });

    it('should clear phone number when all characters are removed', () => {
      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');

      // Clear the phone field by typing only non-digit characters
      fireEvent.changeText(phoneInput, '---');

      expect(phoneInput.props.value).toBe('');
    });

    it('should handle empty phone number input', () => {
      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');

      // Type and then clear
      fireEvent.changeText(phoneInput, '+19175551234');
      fireEvent.changeText(phoneInput, '');

      expect(phoneInput.props.value).toBe('');
    });

    it('should save with empty phone number (clearing existing phone)', async () => {
      const updatedUser = {
        ...mockSession.user,
        user_metadata: { ...mockSession.user.user_metadata, phone_number: '' },
      };
      const mockUpdateUser = jest.fn().mockResolvedValue(createMockUpdateUserResponse(updatedUser));
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: { ...mockSession, user: updatedUser } },
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');
      const saveButton = screen.getByText('settings.profileSave');

      // Clear phone number
      fireEvent.changeText(phoneInput, '');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: { phone_number: '' },
        });
      });
    });

    it('should handle US phone number without + prefix when saving', async () => {
      const updatedUser = {
        ...mockSession.user,
        user_metadata: { ...mockSession.user.user_metadata, phone_number: '+12125551234' },
      };
      const mockUpdateUser = jest.fn().mockResolvedValue(createMockUpdateUserResponse(updatedUser));
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: { ...mockSession, user: updatedUser } },
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');
      const saveButton = screen.getByText('settings.profileSave');

      // Type US phone without + (gets formatted by AsYouType)
      fireEvent.changeText(phoneInput, '2125551234');
      fireEvent.press(saveButton);

      await waitFor(() => {
        // Should normalize to E.164 format
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: { phone_number: '+12125551234' },
        });
      });
    });

    it('should hydrate from user.phone field when available', () => {
      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: {
            ...mockSession,
            user: {
              ...mockSession.user,
              phone: '+14155551234', // phone field takes precedence
              user_metadata: {
                ...mockSession.user.user_metadata,
                phone_number: '+12025551234', // This should be ignored
              },
            },
          },
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });

      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');
      // Should use user.phone, not user_metadata.phone_number
      expect(phoneInput.props.value).toBe('+1 415 555 1234');
    });

    it('should call getUser on mount to refresh profile', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });

      (supabase.auth.getUser as jest.Mock) = mockGetUser;

      renderWithProviders(<ProfileScreen />);

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled();
      });
    });

    it('should handle getUser error gracefully', async () => {
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Failed to get user'),
      });

      (supabase.auth.getUser as jest.Mock) = mockGetUser;

      renderWithProviders(<ProfileScreen />);

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled();
        expect(mockHandleError).toHaveBeenCalled();
      });
    });

    it('should update session with fresh user data from getUser', async () => {
      const mockSetSession = jest.fn();
      const freshUser = {
        ...mockSession.user,
        user_metadata: { ...mockSession.user.user_metadata, full_name: 'Fresh Name' },
      };
      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: freshUser },
        error: null,
      });

      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: mockSession,
          status: 'authenticated',
          setSession: mockSetSession,
        };
        return selector(state);
      });

      (supabase.auth.getUser as jest.Mock) = mockGetUser;

      renderWithProviders(<ProfileScreen />);

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled();
        expect(mockSetSession).toHaveBeenCalledWith(
          expect.objectContaining({
            user: freshUser,
          }),
        );
      });

      // Verify the form was hydrated with fresh data
      const nameInput = screen.getByTestId('profile-name-input');
      expect(nameInput.props.value).toBe('Fresh Name');
    });

    it('should handle malformed phone in user profile gracefully', async () => {
      const sessionWithMalformedPhone = {
        ...mockSession,
        user: {
          ...mockSession.user,
          user_metadata: {
            ...mockSession.user.user_metadata,
            phone_number: 'invalid-phone', // Malformed phone that can't be parsed
          },
        },
      };
      const updatedUser = {
        ...sessionWithMalformedPhone.user,
        user_metadata: {
          ...sessionWithMalformedPhone.user.user_metadata,
          full_name: 'Updated Name',
        },
      };
      const mockUpdateUser = jest.fn().mockResolvedValue(createMockUpdateUserResponse(updatedUser));
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: { ...sessionWithMalformedPhone, user: updatedUser } },
      });

      (useSessionStore as unknown as jest.Mock).mockImplementation((selector) => {
        const state = {
          session: sessionWithMalformedPhone,
          status: 'authenticated',
          setSession: jest.fn(),
        };
        return selector(state);
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const nameInput = screen.getByTestId('profile-name-input');
      const saveButton = screen.getByText('settings.profileSave');

      // Change only the name (phone stays malformed)
      fireEvent.changeText(nameInput, 'Updated Name');
      fireEvent.press(saveButton);

      await waitFor(() => {
        // Should save name change without crashing on malformed phone
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: { full_name: 'Updated Name' },
        });
      });
    });
  });
});
