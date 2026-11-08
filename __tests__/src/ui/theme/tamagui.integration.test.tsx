jest.unmock('tamagui');

import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Paragraph, RadioGroup, Switch, TamaguiProvider, Text, YStack } from 'tamagui';
import { tamaguiConfig } from '../../../../tamagui.config';
import { themeColorSets } from '@/ui/theme/palette';
import { PrimaryButton } from '@/ui/components/PrimaryButton';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
};

describe('Tamagui theme integration', () => {
  it('uses the body font as the default for body and heading text', () => {
    expect(tamaguiConfig.settings.defaultFont).toBe('body');
    expect(tamaguiConfig.fonts.heading.family).toBe(tamaguiConfig.fonts.body.family);
  });

  it('uses the legacy default sizing recipe without reserved true tokens', () => {
    expect(tamaguiConfig.sizing.default).toBe('legacy4');
    expect(tamaguiConfig.sizing.sizes.legacy4.px.height).toBe(14);
    expect(tamaguiConfig.tokens.space).not.toHaveProperty('true');
    expect(tamaguiConfig.tokens.size).not.toHaveProperty('true');
  });

  it('preserves the action button geometry and accent', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <PrimaryButton testID="action">Continue</PrimaryButton>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('action')).toHaveStyle({
      backgroundColor: themeColorSets.light.accent,
      minHeight: 48,
    });
  });

  it('keeps default paragraphs at the production body size and weight', async () => {
    await render(
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <Paragraph testID="body-copy">Supporting information</Paragraph>
      </TamaguiProvider>,
    );
    expect(screen.getByTestId('body-copy')).toHaveStyle({
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 500,
    });
  });

  it('preserves radio and switch geometry using the app sizing recipes', async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <RadioGroup value="first" onValueChange={() => {}}>
            <RadioGroup.Item testID="radio" value="first" size="legacy5">
              <RadioGroup.Indicator />
            </RadioGroup.Item>
          </RadioGroup>
          <Switch
            testID="switch"
            size="legacy7"
            width={56}
            checked={false}
            onCheckedChange={() => {}}
          >
            <Switch.Thumb />
          </Switch>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('radio')).toHaveStyle({ width: 12, height: 12 });
    expect(screen.getByTestId('switch')).toHaveStyle({ width: 56, height: 30 });
  });

  it.each(['light', 'dark'] as const)('resolves %s theme values and spacing', async (theme) => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={theme}>
          <YStack testID="surface" backgroundColor="background" padding="4">
            <Text testID="accent" color="accent-color">
              Hello
            </Text>
          </YStack>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('surface')).toHaveStyle({
      backgroundColor: themeColorSets[theme].background,
      paddingTop: 16,
      paddingRight: 16,
      paddingBottom: 16,
      paddingLeft: 16,
    });
    expect(screen.getByTestId('accent')).toHaveStyle({ color: themeColorSets[theme].accent });
  });
});
