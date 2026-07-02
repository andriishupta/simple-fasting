import { requireNativeModule } from 'expo';

export type NativeFastingWidgetPayload = {
  status: 'active' | 'inactive';
  headline: string;
  subtitle: string;
  startedAt: number;
  goalEndsAt: number;
  hasGoal: boolean;
  hasReachedGoal: boolean;
  progress: number;
  timerView: 'elapsed' | 'remaining';
  lightAccent: `#${string}`;
  darkAccent: `#${string}`;
  lightBackground: `#${string}`;
  darkBackground: `#${string}`;
  lightPrimary: `#${string}`;
  darkPrimary: `#${string}`;
  lightSecondary: `#${string}`;
  darkSecondary: `#${string}`;
};

type NativeFastingWidgetModule = {
  update: (payload: NativeFastingWidgetPayload) => void;
  clear: () => void;
};

export default requireNativeModule<NativeFastingWidgetModule>('NativeFastingWidget');
