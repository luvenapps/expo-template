import type { ComponentProps, ReactNode, Ref } from 'react';
import { forwardRef } from 'react';
import type { TextInputInstance } from 'react-native';
import { Input, View, YStack, useTheme } from 'tamagui';
import { CaptionText, LabelText } from './Text';

type InputProps = ComponentProps<typeof Input>;

export type FormFieldProps = InputProps & {
  label: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  rightElement?: ReactNode;
  testID?: string;
  labelTestID?: string;
  inputTestID?: string;
  helperTestID?: string;
  editable?: boolean;
};

export const FormField = forwardRef<TextInputInstance, FormFieldProps>(function FormField(
  {
    label,
    helperText,
    errorText,
    required,
    rightElement,
    testID,
    labelTestID,
    inputTestID,
    helperTestID,
    editable,
    borderColor,
    placeholderTextColor,
    ...inputProps
  },
  ref,
) {
  const theme = useTheme();
  const helperColor = errorText ? 'dangerColor' : 'colorMuted';

  return (
    <YStack gap="$2" width="100%" testID={testID}>
      <LabelText color="color" testID={labelTestID}>
        {label}
        {required ? ' *' : ''}
      </LabelText>
      <View position="relative" width="100%">
        <Input
          ref={ref as Ref<React.ComponentRef<typeof Input>>}
          width="100%"
          borderColor={
            borderColor ?? 'border-color hover:border-color-hover focus:border-color-focus'
          }
          backgroundColor="background"
          borderWidth={1}
          borderRadius="3"
          placeholderTextColor={
            placeholderTextColor === 'colorMuted' ? theme.colorMuted?.get() : placeholderTextColor
          }
          disabled={editable === false}
          fontSize="2"
          paddingHorizontal="2"
          height={56}
          {...inputProps}
          testID={inputTestID}
        />
        {rightElement ? (
          <View
            position="absolute"
            right="3"
            top={0}
            bottom={0}
            alignItems="center"
            justifyContent="center"
            style={{ pointerEvents: 'box-none' }}
          >
            {rightElement}
          </View>
        ) : null}
      </View>
      {(helperText || errorText) && (
        <CaptionText color={helperColor} testID={helperTestID}>
          {errorText ?? helperText}
        </CaptionText>
      )}
    </YStack>
  );
});
