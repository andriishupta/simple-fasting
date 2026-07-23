import { render } from '@testing-library/react-native';
import { StyleSheet, Text, View } from 'react-native';

import { CenteredWheelPicker } from '@/components/centered-wheel-picker';

describe('CenteredWheelPicker', () => {
  test('centers its selection overlay without caller offset math', async () => {
    const screen = await render(
      <CenteredWheelPicker
        accessibilityLabel="Picker"
        itemWidth={48}
        items={['one', 'two']}
        selectedIndex={0}
        onSelectIndex={jest.fn()}
        renderItem={(item) => <Text>{item}</Text>}
        renderOverlay={() => <View testID="selection-indicator" />}
      />,
    );
    const overlay = screen.getByTestId('selection-indicator').parent;

    expect(overlay?.props.pointerEvents).toBe('none');
    expect(StyleSheet.flatten(overlay?.props.style)).toMatchObject({
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    });
  });
});
