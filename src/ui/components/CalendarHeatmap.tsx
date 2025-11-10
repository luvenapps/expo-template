import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { CaptionText, LabelText } from './Text';

const DEFAULT_DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const COLORS = ['#E2E8F0', '#BFDBFE', '#93C5FD', '#60A5FA', '#2563EB'];

type CalendarHeatmapProps = {
  weeks: number;
  values: number[][];
  dayLabels?: string[];
  legend?: ReactNode;
};

export function CalendarHeatmap({
  weeks,
  values,
  dayLabels = DEFAULT_DAY_LABELS,
  legend,
}: CalendarHeatmapProps) {
  return (
    <YStack gap="$3">
      <XStack gap="$2">
        {Array.from({ length: weeks }).map((_, weekIndex) => (
          <YStack key={`week-${weekIndex}`} gap="$1">
            {dayLabels.map((_, dayIndex) => {
              const intensity = values?.[weekIndex]?.[dayIndex] ?? 0;
              const colorIndex = Math.min(COLORS.length - 1, Math.max(0, intensity));
              return (
                <YStack
                  key={`cell-${weekIndex}-${dayIndex}`}
                  width={16}
                  height={16}
                  borderRadius={4}
                  backgroundColor={COLORS[colorIndex]}
                />
              );
            })}
          </YStack>
        ))}
      </XStack>
      <XStack justifyContent="space-between" alignItems="center">
        <CaptionText color="$colorMuted">{dayLabels.join(' ')}</CaptionText>
        {legend ?? (
          <XStack gap="$1" alignItems="center">
            {COLORS.map((color, index) => (
              <YStack key={color} width={16} height={8} borderRadius={2} backgroundColor={color} />
            ))}
            <LabelText fontSize="$2">Less • More</LabelText>
          </XStack>
        )}
      </XStack>
    </YStack>
  );
}
