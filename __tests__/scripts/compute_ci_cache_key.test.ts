/** @jest-environment node */
import { useCiScriptTestContext } from '../helpers/ciScriptTestContext';

describe('compute_ci_cache_key', () => {
  const context = useCiScriptTestContext();

  test('cache keys are stable and emit only the Actions output', () => {
    const first = context.runScript('compute_ci_cache_key.sh', ['ios']);
    const second = context.runScript('compute_ci_cache_key.sh', ['ios']);
    expect(first.status).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    expect(first.stdout).toMatch(/^key=template-release-v1-ios-[a-f0-9]{64}\n$/);
  });

  test.each([
    { MOCK_TREE: 'changed-source' },
    { EXPO_PUBLIC_API_URL: 'changed' },
    { GOOGLE_SERVICE_INFO_PLIST_B64: 'changed' },
    { ImageVersion: 'changed' },
    { EAS_CLI_VERSION: 'changed' },
  ])('invalidates the cached artifact when build inputs change: %j', (overrides) => {
    const original = context.runScript('compute_ci_cache_key.sh', ['ios']);
    const changed = context.runScript('compute_ci_cache_key.sh', ['ios'], overrides);
    expect(original.status).toBe(0);
    expect(changed.status).toBe(0);
    expect(changed.stdout).not.toBe(original.stdout);
  });

  test('uses separate artifact keys for each platform', () => {
    expect(context.runScript('compute_ci_cache_key.sh', ['android']).stdout).not.toBe(
      context.runScript('compute_ci_cache_key.sh', ['ios']).stdout,
    );
  });

  test('cache keys ignore the workflow run identity', () => {
    const original = context.runScript('compute_ci_cache_key.sh', ['ios']);
    const rerun = context.runScript('compute_ci_cache_key.sh', ['ios'], {
      GITHUB_RUN_ATTEMPT: '2',
      GITHUB_RUN_ID: 'different',
    });
    expect(rerun.stdout).toBe(original.stdout);
  });

  test('rejects an unsupported cache platform', () => {
    expect(context.runScript('compute_ci_cache_key.sh', ['web']).status).not.toBe(0);
  });
});
