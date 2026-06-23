import { createMMKV } from 'react-native-mmkv';

import {
  AccentColorName,
  DataViewPreference,
  StorageKey,
  ThemePreference,
  appStorage,
  createDefaultAppSettings,
  createDefaultGoals,
  createEmptyDiagnosticsState,
  createEmptyActiveFastState,
  createEmptyHistoryState,
} from '@/storage/app-storage';

const timestamp = '2026-06-21T12:00:00.000Z';

describe('app storage', () => {
  test('creates stable defaults', () => {
    expect(createDefaultGoals(timestamp).map(({ name, targetDurationHours }) => [name, targetDurationHours])).toEqual([
      ['12:12', 12],
      ['14:10', 14],
      ['16:8', 16],
      ['18:6', 18],
      ['20:4', 20],
    ]);
    expect(createDefaultAppSettings(timestamp)).toMatchObject({
      themePreference: ThemePreference.System,
      accentColorName: AccentColorName.Blue,
      lastUsedGoalDurationHours: 16,
      dataViewPreference: DataViewPreference.Stats,
      onboardingCompleted: false,
      notificationPromptShown: false,
    });
    expect(createEmptyActiveFastState(timestamp).session).toBeNull();
    expect(createEmptyHistoryState(timestamp).sessions).toEqual([]);
    expect(createEmptyDiagnosticsState(timestamp).events).toEqual([]);
  });

  test('round-trips typed values and supplies defaults', () => {
    const settings = createDefaultAppSettings(timestamp);
    appStorage.insert(StorageKey.Settings, settings);

    expect(appStorage.get(StorageKey.Settings)).toEqual(settings);
    expect(appStorage.getOrDefault(StorageKey.Settings, createDefaultAppSettings('later'))).toEqual(settings);
    expect(appStorage.getOrDefault(StorageKey.History, createEmptyHistoryState(timestamp))).toEqual(
      createEmptyHistoryState(timestamp),
    );
  });

  test('notifies only for application storage keys and unsubscribes', () => {
    const listener = jest.fn();
    const unsubscribe = appStorage.subscribe(listener);

    appStorage.insert(StorageKey.History, createEmptyHistoryState(timestamp));
    createMMKV().set('unrelated', '{}');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(StorageKey.History);

    unsubscribe();
    appStorage.insert(StorageKey.ActiveFast, createEmptyActiveFastState(timestamp));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('quarantines corrupt raw data without losing the evidence', () => {
    const mmkv = createMMKV();
    mmkv.set(StorageKey.Settings, '{broken-json');

    expect(appStorage.get(StorageKey.Settings)).toBeUndefined();
    appStorage.quarantine(StorageKey.Settings, 'Invalid JSON');

    expect(appStorage.getRaw(StorageKey.Settings)).toBeUndefined();
    expect(mmkv.getString(StorageKey.Settings)).toBeUndefined();
  });

  test('clears all local values', () => {
    appStorage.insert(StorageKey.History, createEmptyHistoryState(timestamp));
    appStorage.clear();
    expect(appStorage.get(StorageKey.History)).toBeUndefined();
  });
});
