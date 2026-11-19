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
  testID?: string;
  labelTestID?: string;
  helperTestID?: string;
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
  testID,
  labelTestID,
  helperTestID,
}: SliderFieldProps) {
  return (
    <YStack gap="2" testID={testID}>
      <LabelText testID={labelTestID}>
        {label} • {value.map(Math.round).join(' – ')}
      </LabelText>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={onValueChange}
        size="lg"
        alignSelf="stretch"
        {...sliderProps}
      >
        <Slider.Track backgroundColor="secondaryBackground" height="5" borderRadius="6">
          <Slider.TrackActive backgroundColor="accent-color" />
        </Slider.Track>
        <Slider.Thumb
          index={0}
          circular
          size={false}
          width="5"
          height="5"
          minWidth="5"
          minHeight="5"
          backgroundColor="background"
          borderColor="accent-color"
          borderWidth="controlRing"
        />
        {value.length > 1 ? (
          <Slider.Thumb
            index={1}
            circular
            size={false}
            width="5"
            height="5"
            minWidth="5"
            minHeight="5"
            backgroundColor="background"
            borderColor="accent-color"
            borderWidth="controlRing"
          />
        ) : null}
      </Slider>
      {helperText ? <CaptionText testID={helperTestID}>{helperText}</CaptionText> : null}
    </YStack>
  );
}
