import { fireEvent, render } from '@testing-library/react-native';

import { AppButton } from '@/components/app-button';

describe('AppButton', () => {
  test('exposes a native button and handles presses', async () => {
    const onPress = jest.fn();
    const screen = await render(<AppButton label="Start fast" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Start fast' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not handle presses while disabled', async () => {
    const onPress = jest.fn();
    const screen = await render(<AppButton label="Save" disabled onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
