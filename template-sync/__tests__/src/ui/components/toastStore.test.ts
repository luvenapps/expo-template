import { createToastStore } from '@/ui/components/toastStore';

describe('createToastStore', () => {
  it('initializes with empty messages', () => {
    const store = createToastStore();
    expect(store.messages).toEqual([]);
  });

  it('adds and retrieves messages with defaults', () => {
    const store = createToastStore();
    const id = store.show({ title: 'Hello' });
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0]).toMatchObject({
      id,
      title: 'Hello',
      type: 'info',
      duration: 4000,
    });
  });

  it('respects custom ids and types', () => {
    const store = createToastStore();
    store.show({ id: 'custom', title: 'Hi', type: 'success', duration: 1234 });
    expect(store.messages[0].id).toBe('custom');
    expect(store.messages[0].type).toBe('success');
    expect(store.messages[0].duration).toBe(1234);
  });

  it('dismisses by id', () => {
    const store = createToastStore();
    const firstId = store.show({ title: 'One' });
    store.show({ title: 'Two' });
    expect(store.messages).toHaveLength(2);
    store.dismiss(firstId);
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].title).toBe('Two');
  });

  it('clears all messages', () => {
    const store = createToastStore();
    store.show({ title: 'One' });
    store.show({ title: 'Two' });
    store.clear();
    expect(store.messages).toEqual([]);
  });
});
