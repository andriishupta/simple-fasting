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
  type ActiveFastState,
} from '@/storage/app-storage';
import {
  createFastingWidgetModel,
  type FastingWidgetModel,
} from '@/widgets/fasting-widget-model';

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

function AndroidFastingWidget({
  model,
  theme,
}: {
  model: FastingWidgetModel;
  theme: WidgetTheme;
}) {
  const isActive = model.status === 'active';

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: appUrl }}
      accessibilityLabel={model.accessibilityLabel}
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
        text={isActive ? 'FASTING · SIMPLE FASTING' : 'SIMPLE FASTING'}
        style={{ color: theme.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.08 }}
      />
      {isActive ? (
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start', width: 'match_parent' }}>
          <TextWidget
            text={model.headline}
            maxLines={1}
            style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}
          />
          <TextWidget
            text={model.subtitle.toUpperCase()}
            maxLines={1}
            style={{ color: theme.secondary, fontSize: 10, fontWeight: '500' }}
          />
          <TextWidget
            text={model.displayTime}
            maxLines={1}
            style={{
              color: theme.primary,
              fontSize: 27,
              fontWeight: '700',
              adjustsFontSizeToFit: true,
            }}
          />
          {model.hasGoal ? (
            <FlexWidget
              style={{
                width: 'match_parent',
                height: 5,
                borderRadius: 3,
                backgroundColor: theme.secondary,
              }}>
              <FlexWidget
                style={{
                  flex: Math.max(0.001, model.progress),
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: theme.accent,
                }}
              />
              <FlexWidget style={{ flex: Math.max(0.001, 1 - model.progress), height: 5 }} />
            </FlexWidget>
          ) : null}
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <TextWidget
            text={model.headline}
            maxLines={2}
            style={{ color: theme.primary, fontSize: 21, fontWeight: '700' }}
          />
          <TextWidget
            text={model.subtitle}
            style={{ color: theme.secondary, fontSize: 12, fontWeight: '500' }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

const renderFastingWidget = (state: ActiveFastState): WidgetRepresentation => {
  const goalName = appStorage
    .get(StorageKey.Settings)
    ?.goals.find((goal) => goal.targetDurationHours === state.session?.goalDurationHours)?.name;
  const model = createFastingWidgetModel(state, Date.now(), goalName);

  return {
    light: <AndroidFastingWidget model={model} theme={lightTheme} />,
    dark: <AndroidFastingWidget model={model} theme={darkTheme} />,
  };
};

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
