/* istanbul ignore file */
import type { ComponentProps } from 'react';
import { Slider, YStack } from 'tamagui';
import { CaptionText, LabelText } from './Text';

type SliderFieldProps = {
  label: string;
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  helperText?: string;
  sliderProps?: ComponentProps<typeof Slider>;
};

export function SliderField({
  label,
  helperText,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  sliderProps,
}: SliderFieldProps) {
  return (
    <YStack gap="$2">
      <LabelText>
        {label} • {value.map(Math.round).join(' – ')}
      </LabelText>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={onValueChange}
        size="$7"
        alignSelf="stretch"
        {...sliderProps}
      >
        <Slider.Track backgroundColor="$secondaryBackground" height={24} borderRadius="$6">
          <Slider.TrackActive backgroundColor="$accentColor" />
        </Slider.Track>
        <Slider.Thumb
          index={0}
          circular
          size="$5"
          backgroundColor="$background"
          borderColor="$accentColor"
          borderWidth={3}
        />
        {value.length > 1 ? (
          <Slider.Thumb
            index={1}
            circular
            size="$5"
            backgroundColor="$background"
            borderColor="$accentColor"
            borderWidth={3}
          />
        ) : null}
      </Slider>
      {helperText ? <CaptionText>{helperText}</CaptionText> : null}
    </YStack>
  );
}
