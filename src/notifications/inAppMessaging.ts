import { Platform } from 'react-native';

type FirebaseIAMModule = typeof import('@react-native-firebase/in-app-messaging').default;

export type InAppMessagingProvider = {
  initialize: () => void | Promise<void>;
  setMessageTriggers: (triggers: Record<string, string>) => void | Promise<void>;
  pauseMessages: (paused: boolean) => void | Promise<void>;
};

const noopProvider: InAppMessagingProvider = {
  initialize: () => undefined,
  setMessageTriggers: () => undefined,
  pauseMessages: () => undefined,
};

let provider: InAppMessagingProvider | null | undefined;

function loadFirebaseModule(): FirebaseIAMModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const iamModule = require('@react-native-firebase/in-app-messaging')
      .default as FirebaseIAMModule;
    return iamModule;
  } catch {
    return null;
  }
}

function createFirebaseProvider(): InAppMessagingProvider | null {
  const iamModule = loadFirebaseModule();
  if (!iamModule) return null;

  const iam = iamModule();

  return {
    initialize: async () => {
      // Enable IAM and allow display
      await iam.setAutomaticDataCollectionEnabled(true);
      await iam.setMessagesDisplaySuppressed(false);
    },
    setMessageTriggers: async (triggers) => {
      // Trigger Firebase IAM events for provided keys/values
      for (const [key, value] of Object.entries(triggers)) {
        const eventName = value || key;
        await iam.triggerEvent(eventName);
      }
    },
    pauseMessages: async (paused) => {
      await iam.setMessagesDisplaySuppressed(paused);
    },
  };
}

function getProvider(): InAppMessagingProvider {
  if (provider !== undefined) {
    return provider ?? noopProvider;
  }

  if (Platform.OS === 'web') {
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

/* istanbul ignore next */
export function __resetInAppMessagingProviderForTests() {
  provider = undefined;
}
