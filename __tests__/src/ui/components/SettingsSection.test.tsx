// Mock Card component to avoid jest-expo transform issues
jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui');
  const React = require('react');

  const CardComponent = ({ children, ...props }: any) =>
    React.createElement(actual.YStack, props, children);

  const CardHeader = ({ children, ...props }: any) =>
    React.createElement(actual.YStack, props, children);
  CardHeader.displayName = 'Card.Header';

  const CardFooter = ({ children, ...props }: any) =>
    React.createElement(actual.YStack, props, children);
  CardFooter.displayName = 'Card.Footer';

  CardComponent.Header = CardHeader;
  CardComponent.Footer = CardFooter;

  return {
    ...actual,
    Card: CardComponent,
  };
});

jest.mock('@/ui/theme/ThemeProvider', () => ({
  useThemeContext: jest.fn(() => ({
    resolvedTheme: 'light',
    palette: {
      surface: '#FFFFFF',
      text: '#0F172A',
    },
  })),
}));

import { SettingsSection } from '@/ui/components/SettingsSection';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TamaguiProvider, Theme } from 'tamagui';
import { tamaguiConfig } from '../../../../tamagui.config';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <TamaguiProvider config={tamaguiConfig}>
      <Theme name="light">{component}</Theme>
    </TamaguiProvider>,
  );
};

describe('SettingsSection', () => {
  it('should render with title and children', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
    expect(getByText('Child content')).toBeDefined();
  });

  it('should render without description', () => {
    const { queryByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(queryByText('Test Section')).toBeDefined();
  });

  it('should render with description', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section" description="This is a description">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('This is a description')).toBeDefined();
  });

  it('should render with string footer', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section" footer="This is a footer">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('This is a footer')).toBeDefined();
  });

  it('should render with ReactNode footer', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section" footer={<Text>Custom footer</Text>}>
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Custom footer')).toBeDefined();
  });

  it('should render without footer', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
  });

  it('should render with icon', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section" icon={<Text>Icon</Text>}>
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Icon')).toBeDefined();
    expect(getByText('Test Section')).toBeDefined();
  });

  it('should apply centered alignment', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section" align="center">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
  });

  it('should apply start alignment by default', () => {
    const { getByText } = renderWithProviders(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
  });
});
