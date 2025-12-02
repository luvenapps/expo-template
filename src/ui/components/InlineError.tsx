import { Paragraph } from 'tamagui';

type InlineErrorProps = {
  message?: string | null;
  testID?: string;
};

export function InlineError({ message, testID }: InlineErrorProps) {
  if (!message) return null;
  return (
    <Paragraph color="$dangerColor" fontSize="$3" textAlign="center" testID={testID}>
      {message}
    </Paragraph>
  );
}
