import { render } from '@testing-library/react-native';
import { Platform, View } from 'react-native';
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
    expect(scrollView.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scrollView.props.keyboardDismissMode).toBe(
      Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    );
    expect(scrollView.props.nestedScrollEnabled).toBe(true);
    expect(scrollView.props.scrollsChildToFocus).toBe(true);
    expect(scrollView.props.contentInsetAdjustmentBehavior).toBe('automatic');
  });

  test('uses standard native scrolling by default', async () => {
    const screen = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, right: 0, bottom: 34, left: 0 },
        }}>
        <TabScreenShell>
          <View />
        </TabScreenShell>
      </SafeAreaProvider>,
    );
    const [scrollView] = screen.container.queryAll(
      (instance) => instance.props.contentInsetAdjustmentBehavior === 'automatic',
    );

    expect(scrollView.props.scrollEnabled).toBe(true);
    expect(scrollView.props.bounces).toBe(true);
  });
});
