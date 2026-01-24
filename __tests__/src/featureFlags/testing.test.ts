import { createMockProvider } from '@/featureFlags/testing';

describe('featureFlags testing helper', () => {
  it('notifies listeners when setting a value', () => {
    const { client, set } = createMockProvider({ test_feature_flag: false });
    const listener = jest.fn();
    client.subscribe(listener);

    set('test_feature_flag', true);

    expect(listener).toHaveBeenCalledWith('test_feature_flag');
    expect(client.getFlag('test_feature_flag', false)).toBe(true);
  });

  it('supports manual notify', () => {
    const { client, notify } = createMockProvider();
    const listener = jest.fn();
    client.subscribe(listener);

    notify();

    expect(listener).toHaveBeenCalled();
  });

  it('returns fallback when no override exists', async () => {
    const { client } = createMockProvider();

    expect(client.getFlag('test_feature_flag', true)).toBe(true);

    await client.ready();
    await client.setContext();
    await client.refresh();
    client.destroy();
  });
});
