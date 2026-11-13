import { memo, type JSX } from 'react';
import { Svg, Path, type SvgProps } from 'react-native-svg';
import { themed, type IconProps } from '@tamagui/helpers-icon';

export const Flame: (props: IconProps) => JSX.Element = themed(
  memo(function Flame(props: IconProps) {
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
        <Path
          d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"
          stroke={color}
        />
      </Svg>
    );
  }),
);
