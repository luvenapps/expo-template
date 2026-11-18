import { render, screen } from '@testing-library/react-native';
import * as icons from '@/ui/icons';

jest.mock('@tamagui/helpers-icon', () => ({ themed: (component: unknown) => component }));

describe('generated icons', () => {
  it.each(Object.entries(icons))(
    '%s supports defaults and explicit size and color',
    async (_name, Icon) => {
      const result = await render(<Icon testID="icon" />);
      expect(screen.getByTestId('icon')).toHaveProp('width', 24);
      await result.rerender(<Icon testID="icon" size={20} color="#123456" />);
      expect(screen.getByTestId('icon')).toHaveProp('width', 20);
      expect(screen.getByTestId('icon')).toHaveProp('stroke', '#123456');
    },
  );
});
