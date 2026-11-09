import type { TamaguiBuildOptions } from 'tamagui';

const buildConfig = {
  // v3.1.10 extraction drops CSS rules for some authored styles in Expo web exports.
  // Keep the runtime styling path until extracted output preserves those rules.
  disable: true,
  config: './tamagui.config.ts',
  components: ['tamagui'],
} satisfies TamaguiBuildOptions;

export default buildConfig;
