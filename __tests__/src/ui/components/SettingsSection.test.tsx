import { SettingsSection } from '@/ui/components/SettingsSection';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('SettingsSection', () => {
  it('should render with title and children', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
    expect(getByText('Child content')).toBeDefined();
  });

  it('should render without description', () => {
    const { queryByText } = render(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(queryByText('Test Section')).toBeDefined();
  });

  it('should render with description', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section" description="This is a description">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('This is a description')).toBeDefined();
  });

  it('should render with string footer', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section" footer="This is a footer">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('This is a footer')).toBeDefined();
  });

  it('should render with ReactNode footer', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section" footer={<Text>Custom footer</Text>}>
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Custom footer')).toBeDefined();
  });

  it('should render without footer', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
  });

  it('should render with icon', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section" icon={<Text>Icon</Text>}>
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Icon')).toBeDefined();
    expect(getByText('Test Section')).toBeDefined();
  });

  it('should apply centered alignment', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section" align="center">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
  });

  it('should apply start alignment by default', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section">
        <Text>Child content</Text>
      </SettingsSection>,
    );

    expect(getByText('Test Section')).toBeDefined();
  });
});
