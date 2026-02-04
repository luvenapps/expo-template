export const DEFAULT_FLAGS = {
  test_feature_flag: false,
  new_onboarding_flow: true,
  max_items_per_page: 20,
  legal_terms_url: '',
  legal_privacy_url: '',
  min_app_version: '',
} as const;

export type FeatureFlagKey = keyof typeof DEFAULT_FLAGS;
export type FeatureFlagValue = boolean | string | number | Record<string, unknown>;
export type FeatureFlagStatus = 'loading' | 'ready' | 'error';
export type FeatureFlagSource = 'default' | 'remote' | 'static';

export interface UserContext {
  id?: string;
  email?: string;
  name?: string;
  deviceId?: string;
  isAnonymous?: boolean;
  attributes?: Record<string, string | number | boolean>;
}

export interface FeatureFlagClient {
  ready(): Promise<void>;
  getStatus(): FeatureFlagStatus;
  getFlag<T extends FeatureFlagValue>(key: FeatureFlagKey, fallback: T): T;
  getSource(key: FeatureFlagKey): FeatureFlagSource;
  setContext(context?: UserContext): Promise<void>;
  refresh(): Promise<void>;
  subscribe(listener: (key?: FeatureFlagKey) => void): () => void;
  destroy(): void;
}
