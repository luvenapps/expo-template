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
  testID?: string;
  getItemTestID?: (label: string, index: number) => string;
  formatDayLabel?: (value: number) => string;
  formatPercentLabel?: (percent: number) => string;
};

export function StreakChart({
  data,
  testID,
  getItemTestID,
  formatDayLabel = (value) => `${value} day${value === 1 ? '' : 's'}`,
  formatPercentLabel = (percent) => `${Math.round(percent * 100)}% complete`,
}: StreakChartProps) {
  return (
    <YStack gap="$3" testID={testID}>
      {data.map(({ label, value, max = 1, icon }, index) => {
        const percent = Math.min(1, Math.max(0, value / max));
        const itemTestID = getItemTestID?.(label, index);
        return (
          <YStack key={label} gap="$1" testID={itemTestID}>
            <XStack alignItems="center" gap="$2">
              {icon}
              <LabelText testID={itemTestID ? `${itemTestID}-label` : undefined}>
                {label} • {formatDayLabel(value)}
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
            <CaptionText
              color="$colorMuted"
              testID={itemTestID ? `${itemTestID}-percent` : undefined}
            >
              {formatPercentLabel(percent)}
            </CaptionText>
          </YStack>
        );
      })}
    </YStack>
  );
}
