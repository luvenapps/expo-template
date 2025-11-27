import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { CaptionText, LabelText } from './Text';

const DEFAULT_DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const COLOR_TOKENS = [
  '$backgroundStrong',
  '$backgroundPress',
  '$accentColor',
  '$accentColorHover',
  '$accentColorPress',
];

type CalendarHeatmapProps = {
  weeks: number;
  values: number[][];
  dayLabels?: string[];
  legend?: ReactNode;
  testID?: string;
  getCellTestID?: (weekIndex: number, dayIndex: number) => string;
  dayLabelsTestID?: string;
  legendTestID?: string;
};

export function CalendarHeatmap({
  weeks,
  values,
  dayLabels = DEFAULT_DAY_LABELS,
  legend,
  testID,
  getCellTestID,
  dayLabelsTestID,
  legendTestID,
}: CalendarHeatmapProps) {
  return (
    <YStack gap="$3" testID={testID}>
      <XStack gap="$2">
        {Array.from({ length: weeks }).map((_, weekIndex) => (
          <YStack key={`week-${weekIndex}`} gap="$1">
            {dayLabels.map((_, dayIndex) => {
              const intensity = values?.[weekIndex]?.[dayIndex] ?? 0;
              const colorIndex = Math.min(COLOR_TOKENS.length - 1, Math.max(0, intensity));
              return (
                <YStack
                  key={`cell-${weekIndex}-${dayIndex}`}
                  width={16}
                  height={16}
                  borderRadius={4}
                  backgroundColor={COLOR_TOKENS[colorIndex]}
                  testID={getCellTestID?.(weekIndex, dayIndex)}
                />
              );
            })}
          </YStack>
        ))}
      </XStack>
      <XStack justifyContent="space-between" alignItems="center">
        <CaptionText color="$colorMuted" testID={dayLabelsTestID}>
          {dayLabels.join(' ')}
        </CaptionText>
        {legend ?? (
          <XStack gap="$1" alignItems="center" testID={legendTestID}>
            {COLOR_TOKENS.map((color) => (
              <YStack key={color} width={16} height={8} borderRadius={2} backgroundColor={color} />
            ))}
            <LabelText fontSize="$2">Less • More</LabelText>
          </XStack>
        )}
      </XStack>
    </YStack>
  );
}
