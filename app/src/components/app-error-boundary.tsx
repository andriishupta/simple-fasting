import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackState } from '@/components/feedback-state';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DiagnosticEventKind } from '@/storage/app-storage';
import { recordDiagnosticError } from '@/storage/diagnostic-storage';

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { hasError: boolean };

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    recordDiagnosticError({
      kind: DiagnosticEventKind.Render,
      error,
      context: info.componentStack,
    });
  }

  private retry = (): void => this.setState({ hasError: false });

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={styles.safeArea}>
          <FeedbackState
            kind="error"
            title="Simple Fasting stopped unexpectedly"
            description="Your local fasting data is still on this device. Try opening the screen again, or share the local diagnostics from Settings if the problem repeats."
            action={{ label: 'Try Again', onPress: this.retry, variant: 'primary' }}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
  },
});
