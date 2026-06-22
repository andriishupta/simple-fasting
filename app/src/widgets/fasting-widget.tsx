import type { ActiveFastState } from '@/storage/app-storage';

// Keep this fallback as .tsx. Metro resolves one extension at a time; a .ts fallback would
// win before fasting-widget.ios.tsx / fasting-widget.android.tsx and disable native widgets.
export const updateFastingWidget = (_state: ActiveFastState): void => {};
