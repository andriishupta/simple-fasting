import {
  FlexWidget,
  registerWidgetTaskHandler,
  requestWidgetUpdate,
  TextWidget,
  type WidgetRepresentation,
} from 'react-native-android-widget';

import {
  appStorage,
  createEmptyActiveFastState,
  StorageKey,
  TimerViewPreference,
  type ActiveFastState,
  type FastSession,
} from '@/storage/app-storage';

const widgetName = 'FastingWidget';
const appUrl = 'simple-fasting://';

type WidgetTheme = {
  accent: `#${string}`;
  background: `#${string}`;
  primary: `#${string}`;
  secondary: `#${string}`;
};

const lightTheme: WidgetTheme = {
  accent: '#526FE8',
  background: '#F7F8FC',
  primary: '#17191F',
  secondary: '#626979',
};

const darkTheme: WidgetTheme = {
  accent: '#8EA5FF',
  background: '#15171C',
  primary: '#F5F7FF',
  secondary: '#A9AFBD',
};

const formatTimer = (
  session: FastSession,
  timerViewPreference: TimerViewPreference,
  currentTime = Date.now(),
): string => {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((currentTime - Date.parse(session.startedAt)) / 60_000),
  );
  const goalMinutes = session.goalDurationHours * 60;
  const shownMinutes =
    timerViewPreference === TimerViewPreference.Remaining && goalMinutes > 0
      ? Math.max(0, goalMinutes - elapsedMinutes)
      : elapsedMinutes;
  const hours = Math.floor(shownMinutes / 60);
  const minutes = shownMinutes % 60;

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};

function AndroidFastingWidget({
  state,
  theme,
}: {
  state: ActiveFastState;
  theme: WidgetTheme;
}) {
  const { session, timerViewPreference } = state;
  const isActive = session !== null;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: appUrl }}
      accessibilityLabel={
        isActive ? `Fasting timer ${formatTimer(session, timerViewPreference)}` : 'Open Simple Fasting to start a fast'
      }
      style={{
        width: 'match_parent',
        height: 'match_parent',
        padding: 16,
        borderRadius: 24,
        backgroundColor: theme.background,
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
      <TextWidget
        text={isActive ? 'FASTING' : 'SIMPLE FASTING'}
        style={{ color: theme.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.08 }}
      />
      {isActive ? (
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <TextWidget
            text={formatTimer(session, timerViewPreference)}
            maxLines={1}
            style={{
              color: theme.primary,
              fontSize: 27,
              fontWeight: '700',
              adjustsFontSizeToFit: true,
            }}
          />
          <TextWidget
            text={session.goalDurationHours > 0 ? `${session.goalDurationHours}h goal` : 'Open-ended fast'}
            maxLines={1}
            style={{ color: theme.secondary, fontSize: 12, fontWeight: '500' }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <TextWidget
            text="Ready to fast?"
            maxLines={2}
            style={{ color: theme.primary, fontSize: 21, fontWeight: '700' }}
          />
          <TextWidget
            text="Tap to start"
            style={{ color: theme.secondary, fontSize: 12, fontWeight: '500' }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

const renderFastingWidget = (state: ActiveFastState): WidgetRepresentation => ({
  light: <AndroidFastingWidget state={state} theme={lightTheme} />,
  dark: <AndroidFastingWidget state={state} theme={darkTheme} />,
});

registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetInfo.widgetName !== widgetName || widgetAction === 'WIDGET_DELETED') {
    return;
  }

  const activeFastState = appStorage.getOrDefault(
    StorageKey.ActiveFast,
    createEmptyActiveFastState(new Date().toISOString()),
  );

  renderWidget(renderFastingWidget(activeFastState));
});

export const updateFastingWidget = (state: ActiveFastState): void => {
  void requestWidgetUpdate({
    widgetName,
    renderWidget: () => renderFastingWidget(state),
  }).catch(() => {
    // Widget availability must never block local fasting state updates.
  });
};
