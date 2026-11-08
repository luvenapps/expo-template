import Constants from 'expo-constants';
import { Platform } from 'react-native';

type FirebaseIAMModule = typeof import('@react-native-firebase/in-app-messaging');

export type InAppMessagingProvider = {
  initialize: () => void | Promise<void>;
  setMessageTriggers: (triggers: Record<string, string>) => void | Promise<void>;
  pauseMessages: (paused: boolean) => void | Promise<void>;
  allowDisplay: () => void | Promise<void>;
};

const noopProvider: InAppMessagingProvider = {
  initialize: () => undefined,
  setMessageTriggers: () => undefined,
  pauseMessages: () => undefined,
  allowDisplay: () => undefined,
};

let provider: InAppMessagingProvider | null | undefined;

function isFirebaseEnabled() {
  return (
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1'
  );
}

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
}

function loadFirebaseModule(): FirebaseIAMModule | null {
  if (Platform.OS === 'web') return null;
  if (isExpoGo()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/in-app-messaging') as FirebaseIAMModule;
  } catch {
    return null;
  }
}

function createFirebaseProvider(): InAppMessagingProvider | null {
  const iamModule = loadFirebaseModule();
  if (!iamModule) return null;

  const iam = iamModule.getInAppMessaging();

  return {
    initialize: async () => {
      // Enable IAM without suppression (only custom triggers like app_ready)
      await iamModule.setAutomaticDataCollectionEnabled(iam, true);
      await iamModule.setMessagesDisplaySuppressed(iam, false);
    },
    allowDisplay: async () => {
      await iamModule.setMessagesDisplaySuppressed(iam, false);
    },
    setMessageTriggers: async (triggers) => {
      // Trigger Firebase IAM events for provided keys/values
      for (const [key, value] of Object.entries(triggers)) {
        const eventName = value || key;
        await iamModule.triggerEvent(iam, eventName);
      }
    },
    pauseMessages: async (paused) => {
      await iamModule.setMessagesDisplaySuppressed(iam, paused);
    },
  };
}

function getProvider(): InAppMessagingProvider {
  if (provider !== undefined) {
    return provider ?? noopProvider;
  }

  if (!isFirebaseEnabled() || Platform.OS === 'web') {
    provider = noopProvider;
    return provider;
  }

  provider = createFirebaseProvider() ?? noopProvider;
  return provider;
}

export async function initializeInAppMessaging() {
  await getProvider().initialize();
}

export async function setMessageTriggers(triggers: Record<string, string>) {
  await getProvider().setMessageTriggers(triggers);
}

export async function pauseMessages(paused: boolean) {
  await getProvider().pauseMessages(paused);
}

export async function allowInAppMessages() {
  await getProvider().allowDisplay();
}

/* istanbul ignore next */
export function __resetInAppMessagingProviderForTests() {
  provider = undefined;
}
