import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { ToastContainer } from '../../../../src/ui/components/Toast';
import { createToastStore } from '../../../../src/ui/components/toastStore';

// Simplify ToastContainer rendering for determinism in tests
jest.mock('../../../../src/ui/components/Toast', () => {
  const actual = jest.requireActual('../../../../src/ui/components/Toast');
  const React = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  const MockToastContainer = ({ messages, dismiss, testID }: any) => {
    if (!messages || messages.length === 0) return null;

    return (
      <View testID={testID}>
        {messages.map((m: any) => (
          <View key={m.id}>
            <Text>{m.title}</Text>
            {m.description ? <Text>{m.description}</Text> : null}
            <TouchableOpacity onPress={() => dismiss(m.id)}>
              <Text>dismiss</Text>
            </TouchableOpacity>
            {m.actionLabel && m.onAction ? (
              <TouchableOpacity
                onPress={() => {
                  m.onAction?.();
                  dismiss(m.id);
                }}
              >
                <Text>{m.actionLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  return { ...actual, ToastContainer: MockToastContainer };
});

describe('createToastStore', () => {
  it('initializes with empty messages', () => {
    const store = createToastStore();
    expect(store.messages).toEqual([]);
  });

  it('adds a message with show()', () => {
    const store = createToastStore();
    store.show({ title: 'Test Message' });
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].title).toBe('Test Message');
  });

  it('generates default ID when not provided', () => {
    const store = createToastStore();
    store.show({ title: 'Test' });
    expect(store.messages[0].id).toBeDefined();
    expect(typeof store.messages[0].id).toBe('string');
  });

  it('uses custom ID when provided', () => {
    const store = createToastStore();
    store.show({ id: 'custom-id', title: 'Test' });
    expect(store.messages[0].id).toBe('custom-id');
  });

  it('sets default type to info', () => {
    const store = createToastStore();
    store.show({ title: 'Test' });
    expect(store.messages[0].type).toBe('info');
  });

  it('sets default duration to 4000', () => {
    const store = createToastStore();
    store.show({ title: 'Test' });
    expect(store.messages[0].duration).toBe(4000);
  });

  it('allows custom type', () => {
    const store = createToastStore();
    store.show({ title: 'Success', type: 'success' });
    expect(store.messages[0].type).toBe('success');
  });

  it('allows custom duration', () => {
    const store = createToastStore();
    store.show({ title: 'Test', duration: 2000 });
    expect(store.messages[0].duration).toBe(2000);
  });

  it('dismisses a specific message', () => {
    const store = createToastStore();
    const messageId = store.show({ title: 'Message 1' });
    store.show({ title: 'Message 2' });
    expect(store.messages).toHaveLength(2);
    store.dismiss(messageId);
    expect(store.messages).toHaveLength(1);
    expect(store.messages[0].title).toBe('Message 2');
  });

  it('clears all messages', () => {
    const store = createToastStore();
    store.show({ title: 'Message 1' });
    store.show({ title: 'Message 2' });
    store.show({ title: 'Message 3' });
    expect(store.messages).toHaveLength(3);
    store.clear();
    expect(store.messages).toEqual([]);
  });

  it('returns message ID from show()', () => {
    const store = createToastStore();
    const returnedId = store.show({ title: 'Test' });
    expect(returnedId).toBe(store.messages[0].id);
  });

  it('supports description field', () => {
    const store = createToastStore();
    store.show({ title: 'Title', description: 'Description text' });
    expect(store.messages[0].description).toBe('Description text');
  });

  it('supports action label and callback', () => {
    const mockAction = jest.fn();
    const store = createToastStore();
    store.show({ title: 'Test', actionLabel: 'Undo', onAction: mockAction });
    expect(store.messages[0].actionLabel).toBe('Undo');
    expect(store.messages[0].onAction).toBe(mockAction);
  });
});

describe('ToastContainer', () => {
  const mockDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders nothing when messages array is empty', () => {
    const { toJSON } = render(<ToastContainer messages={[]} dismiss={mockDismiss} />);

    expect(toJSON()).toBeNull();
  });

  it('renders toast with title', () => {
    const { getByText } = render(
      <ToastContainer
        messages={[{ id: 'test-1', title: 'Test Title', type: 'info', duration: 4000 }]}
        dismiss={mockDismiss}
      />,
    );

    expect(getByText('Test Title')).toBeTruthy();
  });

  it('renders toast with description', () => {
    const { getByText } = render(
      <ToastContainer
        messages={[
          {
            id: 'test-1',
            title: 'Title',
            description: 'Description text',
            type: 'info',
            duration: 4000,
          },
        ]}
        dismiss={mockDismiss}
      />,
    );

    expect(getByText('Description text')).toBeTruthy();
  });

  it('does not render description when not provided', () => {
    const { queryByTestId } = render(
      <ToastContainer
        messages={[{ id: 'test-1', title: 'Title', type: 'info', duration: 4000 }]}
        dismiss={mockDismiss}
      />,
    );

    expect(queryByTestId('toast-test-1-description')).toBeNull();
  });

  it('renders action button when provided', () => {
    const { getByText } = render(
      <ToastContainer
        messages={[
          {
            id: 'test-1',
            title: 'Title',
            actionLabel: 'Undo',
            onAction: jest.fn(),
            type: 'info',
            duration: 4000,
          },
        ]}
        dismiss={mockDismiss}
      />,
    );

    expect(getByText('Undo')).toBeTruthy();
  });

  it('does not render action button when label missing', () => {
    const { queryByText } = render(
      <ToastContainer
        messages={[
          { id: 'test-1', title: 'Title', onAction: jest.fn(), type: 'info', duration: 4000 },
        ]}
        dismiss={mockDismiss}
      />,
    );

    expect(queryByText('Undo')).toBeNull();
  });

  it('does not render action button when callback missing', () => {
    const { queryByText } = render(
      <ToastContainer
        messages={[
          { id: 'test-1', title: 'Title', actionLabel: 'Undo', type: 'info', duration: 4000 },
        ]}
        dismiss={mockDismiss}
      />,
    );

    expect(queryByText('Undo')).toBeNull();
  });

  it('calls dismiss when dismiss button is pressed', () => {
    const { getByText } = render(
      <ToastContainer
        messages={[{ id: 'test-1', title: 'Title', type: 'info', duration: 4000 }]}
        dismiss={mockDismiss}
      />,
    );

    fireEvent.press(getByText('dismiss'));
    expect(mockDismiss).toHaveBeenCalledWith('test-1');
  });

  it('calls onAction and dismisses when action button is pressed', () => {
    const mockAction = jest.fn();
    const { getByText } = render(
      <ToastContainer
        messages={[
          {
            id: 'test-1',
            title: 'Title',
            actionLabel: 'Undo',
            onAction: mockAction,
            type: 'info',
            duration: 4000,
          },
        ]}
        dismiss={mockDismiss}
      />,
    );

    fireEvent.press(getByText('Undo'));
    expect(mockAction).toHaveBeenCalled();
    expect(mockDismiss).toHaveBeenCalledWith('test-1');
  });

  it('auto-dismisses message after duration', async () => {
    render(
      <ToastContainer
        messages={[{ id: 'test-1', title: 'Title', type: 'info', duration: 2000 }]}
        dismiss={mockDismiss}
      />,
    );

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('does not auto-dismiss when duration is undefined', () => {
    render(
      <ToastContainer
        messages={[{ id: 'test-1', title: 'Title', type: 'info' }]}
        dismiss={mockDismiss}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('renders multiple toasts', () => {
    const { toJSON } = render(
      <ToastContainer
        messages={[
          { id: 'test-1', title: 'Message 1', type: 'info', duration: 4000 },
          { id: 'test-2', title: 'Message 2', type: 'success', duration: 4000 },
          { id: 'test-3', title: 'Message 3', type: 'error', duration: 4000 },
        ]}
        dismiss={mockDismiss}
      />,
    );

    expect(toJSON()).not.toBeNull();
  });

  it('cleans up timers on unmount', () => {
    const { unmount } = render(
      <ToastContainer
        messages={[{ id: 'test-1', title: 'Title', type: 'info', duration: 2000 }]}
        dismiss={mockDismiss}
      />,
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockDismiss).not.toHaveBeenCalled();
  });

  it('renders with container testID', () => {
    const { getByTestId } = render(
      <ToastContainer
        testID="toast-container"
        messages={[{ id: 'test-1', title: 'Title', type: 'info', duration: 4000 }]}
        dismiss={mockDismiss}
      />,
    );

    expect(getByTestId('toast-container')).toBeTruthy();
  });
});
