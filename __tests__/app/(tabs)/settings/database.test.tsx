import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import DatabaseViewerScreen from '../../../../app/(tabs)/settings/database';

const mockGetDb = jest.fn();
const mockBack = jest.fn();
let mockRows: any[] = [];
let mockRecords: any[] = [];

jest.mock('@/db/sqlite', () => ({ getDb: () => mockGetDb() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('@/ui/icons', () => {
  const React = require('react');
  return {
    Database: () => React.createElement('View'),
    ChevronLeft: () => React.createElement('Text', null, 'Previous'),
    ChevronRight: () => React.createElement('Text', null, 'Next'),
  };
});
jest.mock('@/ui', () => {
  const React = require('react');
  return {
    ScreenContainer: ({ children }: any) => React.createElement('View', null, children),
    SecondaryButton: ({ children, onPress }: any) =>
      React.createElement('Text', { onPress }, children),
  };
});
jest.mock('tamagui', () => {
  const React = require('react');
  const Box = ({ children, ...props }: any) => React.createElement('View', props, children);
  const Label = ({ children, ...props }: any) => React.createElement('Text', props, children);
  const Button = ({ children, onPress, disabled }: any) =>
    React.createElement('View', { onPress, disabled, accessibilityRole: 'button' }, children);
  return { Button, Card: Box, Paragraph: Label, Text: Label, XStack: Box, YStack: Box };
});

const platform = (value: string) =>
  Object.defineProperty(Platform, 'OS', { configurable: true, value });

describe('database viewer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    platform('ios');
    mockRows = [];
    mockRecords = [];
    mockGetDb.mockResolvedValue({
      select: () => ({
        from: () =>
          Object.assign(Promise.resolve(mockRows), {
            limit: () => ({ offset: () => Promise.resolve(mockRecords) }),
          }),
      }),
    });
  });
  afterAll(() => platform('ios'));

  it('explains web is unsupported and returns to the previous screen', async () => {
    platform('web');
    await render(<DatabaseViewerScreen />);
    expect(screen.getByText('Not Available on Web')).toBeTruthy();
    await fireEvent.press(screen.getByText('Go Back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('loads empty tables and changes table and page size', async () => {
    await render(<DatabaseViewerScreen />);
    await screen.findByText('No data found');
    await fireEvent.press(screen.getByText('⏰ Reminders'));
    await fireEvent.press(screen.getByText('50'));
    await waitFor(() => expect(mockGetDb).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Page 1 of 1')).toBeTruthy();
  });

  it('shows rows and supports pagination in both directions', async () => {
    mockRows = Array.from({ length: 30 }, (_, id) => ({ id }));
    mockRecords = [{ id: 1, note: null, metadata: { enabled: true } }];
    await render(<DatabaseViewerScreen />);
    await screen.findByText('{"enabled":true}');
    expect(screen.getByText('null')).toBeTruthy();
    await fireEvent.press(screen.getByText('Next'));
    await screen.findByText('Page 2 of 2');
    await fireEvent.press(screen.getByText('Previous'));
    await screen.findByText('Page 1 of 2');
  });

  it.each([new Error('database unavailable'), 'unexpected'])(
    'shows a database error',
    async (error) => {
      mockGetDb.mockRejectedValue(error);
      await render(<DatabaseViewerScreen />);
      expect(
        await screen.findByText(error instanceof Error ? error.message : 'Failed to fetch data'),
      ).toBeTruthy();
    },
  );
});
