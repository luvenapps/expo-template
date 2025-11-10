import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { CaptionText, LabelText } from './Text';

type StreakDatum = {
  label: string;
  value: number;
  max?: number;
  icon?: ReactNode;
};

type StreakChartProps = {
  data: StreakDatum[];
};

export function StreakChart({ data }: StreakChartProps) {
  return (
    <YStack gap="$3">
      {data.map(({ label, value, max = 1, icon }) => {
        const percent = Math.min(1, Math.max(0, value / max));
        return (
          <YStack key={label} gap="$1">
            <XStack alignItems="center" gap="$2">
              {icon}
              <LabelText>
                {label} • {value} day{value === 1 ? '' : 's'}
              </LabelText>
            </XStack>
            <XStack
              height={12}
              borderRadius={999}
              backgroundColor="$backgroundPress"
              overflow="hidden"
            >
              <XStack flexBasis={`${percent * 100}%`} backgroundColor="$accentColor" />
            </XStack>
            <CaptionText color="$colorMuted">{Math.round(percent * 100)}% complete</CaptionText>
          </YStack>
        );
      })}
    </YStack>
  );
}
