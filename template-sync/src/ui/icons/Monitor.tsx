import { memo, type JSX } from 'react';
import { Svg, Line, Rect, type SvgProps } from 'react-native-svg';
import { themed, type IconProps } from '@tamagui/helpers-icon';

export const Monitor: (props: IconProps) => JSX.Element = themed(
  memo(function Monitor(props: IconProps) {
    const {
      color = 'black',
      size = 24,
      ...otherProps
    } = props as SvgProps & {
      color?: string;
      size?: number;
    };
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...otherProps}
      >
        <Rect width="20" height="14" x="2" y="3" rx="2" stroke={color} />
        <Line x1="8" x2="16" y1="21" y2="21" stroke={color} />
        <Line x1="12" x2="12" y1="17" y2="21" stroke={color} />
      </Svg>
    );
  }),
);
