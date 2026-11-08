import { getPushRegistrationStatus } from '@/notifications/pushRegistrationStatus';

describe('getPushRegistrationStatus', () => {
  const messagingInstance = {};

  it('does not request tokens when remote message registration is missing', async () => {
    const messagingModule = {
      getMessaging: jest.fn(() => messagingInstance),
      isDeviceRegisteredForRemoteMessages: jest.fn(() => false),
      getAPNSToken: jest.fn(),
      getToken: jest.fn(),
    } as unknown as Parameters<typeof getPushRegistrationStatus>[0];

    await expect(getPushRegistrationStatus(messagingModule)).resolves.toEqual({
      isRegistered: false,
      apnsToken: null,
      fcmToken: null,
    });
    expect(messagingModule.isDeviceRegisteredForRemoteMessages).toHaveBeenCalledWith(
      messagingInstance,
    );
    expect(messagingModule.getAPNSToken).not.toHaveBeenCalled();
    expect(messagingModule.getToken).not.toHaveBeenCalled();
  });

  it('reads APNs and FCM tokens after registration', async () => {
    const messagingModule = {
      getMessaging: jest.fn(() => messagingInstance),
      isDeviceRegisteredForRemoteMessages: jest.fn(() => true),
      getAPNSToken: jest.fn().mockResolvedValue('apns-token'),
      getToken: jest.fn().mockResolvedValue('fcm-token'),
    } as unknown as Parameters<typeof getPushRegistrationStatus>[0];

    await expect(getPushRegistrationStatus(messagingModule)).resolves.toEqual({
      isRegistered: true,
      apnsToken: 'apns-token',
      fcmToken: 'fcm-token',
    });
    expect(messagingModule.getAPNSToken).toHaveBeenCalledWith(messagingInstance);
    expect(messagingModule.getToken).toHaveBeenCalledWith(messagingInstance);
  });
});
