type MessagingModule = Pick<
  typeof import('@react-native-firebase/messaging'),
  'getMessaging' | 'isDeviceRegisteredForRemoteMessages' | 'getAPNSToken' | 'getToken'
>;

export async function getPushRegistrationStatus(messagingModule: MessagingModule) {
  const instance = messagingModule.getMessaging();
  const isRegistered = messagingModule.isDeviceRegisteredForRemoteMessages(instance);

  if (!isRegistered) {
    return { isRegistered, apnsToken: null, fcmToken: null };
  }

  const [apnsToken, fcmToken] = await Promise.all([
    messagingModule.getAPNSToken(instance),
    messagingModule.getToken(instance),
  ]);

  return { isRegistered, apnsToken, fcmToken };
}
