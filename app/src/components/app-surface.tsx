import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AppSurfaceProps = ViewProps & {
  padded?: boolean;
};

export function AppSurface({ padded = true, style, ...viewProps }: AppSurfaceProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: theme.background,
          borderColor: theme.backgroundSelected,
        },
        padded && styles.padded,
        style,
      ]}
      {...viewProps}
    />
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: 1,
    borderRadius: Radius.surface,
    borderCurve: 'continuous',
  },
  padded: {
    padding: Spacing.three,
  },
});
