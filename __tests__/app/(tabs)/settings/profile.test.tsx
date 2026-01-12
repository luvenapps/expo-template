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
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useFriendlyErrorHandler as jest.Mock).mockReturnValue(mockHandleError);
    mockHandleError.mockReturnValue({
      friendly: { description: 'Test error', descriptionKey: 'errors.test' },
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
          phone_number: '+1234567890',
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
      expect(screen.getByTestId('profile-phone-input').props.value).toBe('+1234567890');
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
      fireEvent.changeText(phoneInput, '+9876543210');

      expect(nameInput.props.value).toBe('New Name');
      expect(emailInput.props.value).toBe('new@example.com');
      expect(phoneInput.props.value).toBe('+9876543210');
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
      const mockUpdateUser = jest.fn().mockResolvedValue({ error: null });
      const mockGetSession = jest.fn().mockResolvedValue({
        data: {
          session: { ...mockSession, user: { ...mockSession.user, email: 'updated@example.com' } },
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
      const mockUpdateUser = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ error: null }), 100);
          }),
      );
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
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
      const mockUpdateUser = jest.fn().mockResolvedValue({ error: null });
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
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
      const mockUpdateUser = jest.fn().mockResolvedValue({ error: null });
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: mockSession },
      });

      (supabase.auth.updateUser as jest.Mock) = mockUpdateUser;
      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      renderWithProviders(<ProfileScreen />);

      const phoneInput = screen.getByTestId('profile-phone-input');
      const saveButton = screen.getByText('settings.profileSave');

      fireEvent.changeText(phoneInput, '+9876543210');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({
          data: { phone_number: '+9876543210' },
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
  });
});
