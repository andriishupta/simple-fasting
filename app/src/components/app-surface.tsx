import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
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
          backgroundColor: theme.backgroundElement,
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
    borderRadius: Spacing.two,
  },
  padded: {
    padding: Spacing.three,
  },
});
