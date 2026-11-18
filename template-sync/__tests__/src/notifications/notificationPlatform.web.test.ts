import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import * as firebasePush from '@/notifications/firebasePush';

// Mock the firebasePush module
jest.mock('@/notifications/firebasePush', () => ({
  registerForPushNotifications: jest.fn(),
  revokePushToken: jest.fn(),
}));

const registerForPushNotifications =
  firebasePush.registerForPushNotifications as jest.MockedFunction<
    typeof firebasePush.registerForPushNotifications
  >;
const revokePushToken = firebasePush.revokePushToken as jest.MockedFunction<
  typeof firebasePush.revokePushToken
>;

// Import after mocks are set up
const { requestPermission, revokePermission } = require('@/notifications/notificationPlatform.web');

describe('notificationPlatform.web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPermission', () => {
    it('returns granted status with token when registration succeeds', async () => {
      registerForPushNotifications.mockResolvedValue({
        status: 'registered',
        token: 'test-token-abc',
      });

      const result = await requestPermission();

      expect(result).toEqual({
        status: 'granted',
        token: 'test-token-abc',
      });
      expect(registerForPushNotifications).toHaveBeenCalled();
    });

    it('returns denied status when registration is denied', async () => {
      registerForPushNotifications.mockResolvedValue({
        status: 'denied',
      });

      const result = await requestPermission();

      expect(result).toEqual({
        status: 'denied',
      });
      expect(registerForPushNotifications).toHaveBeenCalled();
    });

    it('returns unavailable status when push is not available', async () => {
      registerForPushNotifications.mockResolvedValue({
        status: 'unavailable',
      });

      const result = await requestPermission();

      expect(result).toEqual({
        status: 'unavailable',
      });
      expect(registerForPushNotifications).toHaveBeenCalled();
    });

    it('returns error status with message when registration fails', async () => {
      registerForPushNotifications.mockResolvedValue({
        status: 'error',
        message: 'Service worker registration failed',
      });

      const result = await requestPermission();

      expect(result).toEqual({
        status: 'error',
        message: 'Service worker registration failed',
      });
      expect(registerForPushNotifications).toHaveBeenCalled();
    });

    it('returns error with default message when no message provided', async () => {
      registerForPushNotifications.mockResolvedValue({
        status: 'error',
      } as any);

      const result = await requestPermission();

      expect(result).toEqual({
        status: 'error',
        message: 'Unknown error',
      });
      expect(registerForPushNotifications).toHaveBeenCalled();
    });
  });

  describe('revokePermission', () => {
    it('calls revokePushToken', async () => {
      revokePushToken.mockResolvedValue({ status: 'revoked' });

      await revokePermission();

      expect(revokePushToken).toHaveBeenCalled();
    });

    it('handles revoke errors gracefully', async () => {
      revokePushToken.mockRejectedValue(new Error('Failed to unsubscribe'));

      await expect(revokePermission()).rejects.toThrow('Failed to unsubscribe');
      expect(revokePushToken).toHaveBeenCalled();
    });
  });
});
