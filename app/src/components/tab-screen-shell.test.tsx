import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabScreenShell } from '@/components/tab-screen-shell';

describe('TabScreenShell', () => {
  test('keeps the inset-aware scroll view mounted when scrolling is disabled', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}>
        <TabScreenShell scrollEnabled={false}>
          <View />
        </TabScreenShell>
      </SafeAreaProvider>,
    );
    const [scrollView] = screen.container.queryAll(
      (instance) => instance.props.contentInsetAdjustmentBehavior === 'automatic',
    );

    expect(scrollView).toBeDefined();
    expect(scrollView.props.scrollEnabled).toBe(false);
    expect(scrollView.props.bounces).toBe(false);
    expect(scrollView.props.contentInsetAdjustmentBehavior).toBe('automatic');
  });
});
