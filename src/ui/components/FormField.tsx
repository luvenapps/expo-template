import type { ComponentProps, ReactNode } from 'react';
import { forwardRef } from 'react';
import { Input, View, YStack } from 'tamagui';
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
};

export const FormField = forwardRef<React.ComponentRef<typeof Input>, FormFieldProps>(
  function FormField(
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
      ...inputProps
    },
    ref,
  ) {
    const helperColor = errorText ? '$red10' : '$colorMuted';

    return (
      <YStack gap="$2" width="100%" testID={testID}>
        <LabelText color="$color" testID={labelTestID}>
          {label}
          {required ? ' *' : ''}
        </LabelText>
        <View position="relative" width="100%">
          <Input
            ref={ref}
            width="100%"
            borderColor="$borderColor"
            backgroundColor="$background"
            borderWidth={1}
            borderRadius="$3"
            size="$2"
            height={56}
            testID={inputTestID}
            {...inputProps}
          />
          {rightElement ? (
            <View
              position="absolute"
              right="$3"
              top="50%"
              pointerEvents="box-none"
              style={{ transform: [{ translateY: -16 }] }}
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
  },
);
