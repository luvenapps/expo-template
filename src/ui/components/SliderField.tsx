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
        {...sliderProps}
      >
        <Slider.Track>
          <Slider.TrackActive />
        </Slider.Track>
        <Slider.Thumb circular index={0} />
        {value.length > 1 ? <Slider.Thumb circular index={1} /> : null}
      </Slider>
      {helperText ? <CaptionText>{helperText}</CaptionText> : null}
    </YStack>
  );
}
