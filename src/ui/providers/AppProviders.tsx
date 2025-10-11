import { PropsWithChildren } from 'react';
import { TamaguiProvider } from 'tamagui';
import { tamaguiConfig } from '../../../tamagui.config';

export function AppProviders({ children }: PropsWithChildren) {
  return <TamaguiProvider config={tamaguiConfig}>{children}</TamaguiProvider>;
}
