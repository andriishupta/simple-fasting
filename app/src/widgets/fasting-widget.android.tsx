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
import { createFastingWidgetModel } from '@/widgets/fasting-widget-model';

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
  state,
  theme,
}: {
  state: ActiveFastState;
  theme: WidgetTheme;
}) {
  const model = createFastingWidgetModel(state);
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
        text={isActive ? 'FASTING' : 'SIMPLE FASTING'}
        style={{ color: theme.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.08 }}
      />
      {isActive ? (
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
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
          <TextWidget
            text={model.subtitle}
            maxLines={1}
            style={{ color: theme.secondary, fontSize: 12, fontWeight: '500' }}
          />
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
