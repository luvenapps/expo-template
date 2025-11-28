import { Platform } from 'react-native';
import { useAnalytics } from '@/observability/AnalyticsProvider';

type FirebaseIAMModule = typeof import('@react-native-firebase/in-app-messaging').default;
type FirebaseIAMInstance = ReturnType<FirebaseIAMModule> & {
  onMessageDisplayed?: (listener: () => void) => void;
  onMessageDismissed?: (listener: () => void) => void;
  onMessageClicked?: (listener: () => void) => void;
};

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
let analytics: ReturnType<typeof useAnalytics> | null = null;

function isFirebaseEnabled() {
  return (
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === 'true' ||
    process.env.EXPO_PUBLIC_TURN_ON_FIREBASE === '1'
  );
}

function getAnalytics() {
  if (analytics) return analytics;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAnalytics: analyticsHook } = require('@/observability/AnalyticsProvider');
    analytics = analyticsHook();
    return analytics;
  } catch {
    return null;
  }
}

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

  const iam = iamModule() as FirebaseIAMInstance;

  return {
    initialize: async () => {
      // Enable IAM without suppression (only custom triggers like app_ready)
      await iam.setAutomaticDataCollectionEnabled(true);
      await iam.setMessagesDisplaySuppressed(false);
      if (typeof iam.onMessageDisplayed === 'function') {
        iam.onMessageDisplayed(() => {
          getAnalytics()?.trackEvent('iam:displayed');
        });
      }
      if (typeof iam.onMessageDismissed === 'function') {
        iam.onMessageDismissed(() => {
          getAnalytics()?.trackEvent('iam:dismissed');
        });
      }
      if (typeof iam.onMessageClicked === 'function') {
        iam.onMessageClicked(() => {
          getAnalytics()?.trackEvent('iam:clicked');
        });
      }
    },
    allowDisplay: async () => {
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
