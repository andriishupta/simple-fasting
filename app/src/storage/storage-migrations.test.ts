import { createMMKV } from 'react-native-mmkv';

import {
  DataViewPreference,
  StorageKey,
  StorageSchemaVersion,
  appStorage,
} from '@/storage/app-storage';
import { initializeAppStorage, resetAppStorage } from '@/storage/storage-migrations';

const initialTime = new Date('2026-06-21T12:00:00.000Z');

describe('storage initialization and migration', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(initialTime);
    appStorage.clear();
  });

  afterEach(() => jest.useRealTimers());

  test('initializes every required storage partition on a fresh install', () => {
    initializeAppStorage();

    expect(appStorage.get(StorageKey.Metadata)).toMatchObject({
      schemaVersion: StorageSchemaVersion.V1,
      initializedAt: initialTime.toISOString(),
      updatedAt: initialTime.toISOString(),
    });
    expect(appStorage.get(StorageKey.Settings)?.goals).toHaveLength(5);
    expect(appStorage.get(StorageKey.ActiveFast)?.session).toBeNull();
    expect(appStorage.get(StorageKey.History)?.sessions).toEqual([]);
    expect(appStorage.get(StorageKey.Diagnostics)?.events).toEqual([]);
  });

  test('does not create an installation identifier during initialization', () => {
    initializeAppStorage();

    initializeAppStorage();

    expect(createMMKV().getString('installationId')).toBeUndefined();
  });

  test('clears all local app data without preserving an installation identifier', () => {
    initializeAppStorage();
    createMMKV().set('installationId', JSON.stringify({ schemaVersion: 1, installationId: 'old' }));

    resetAppStorage();

    expect(createMMKV().getString('installationId')).toBeUndefined();
    expect(appStorage.get(StorageKey.History)?.sessions).toEqual([]);
  });

  test('normalizes legacy values and preserves the original initialization time', () => {
    createMMKV().set(
      StorageKey.Metadata,
      JSON.stringify({
        schemaVersion: 1,
        appVersion: '0.9.0',
        expoVersion: '55',
        initializedAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    createMMKV().set(
      StorageKey.Settings,
      JSON.stringify({ goals: [], notifications: {} }),
    );

    initializeAppStorage();

    expect(appStorage.get(StorageKey.Metadata)?.initializedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(appStorage.get(StorageKey.Settings)).toMatchObject({
      schemaVersion: StorageSchemaVersion.V1,
      dataViewPreference: DataViewPreference.Stats,
    });
    expect(appStorage.get(StorageKey.Settings)?.goals).toHaveLength(5);
  });

  test('recovers from invalid JSON without blocking startup', () => {
    createMMKV().set(StorageKey.Settings, '{not-json');
    createMMKV().set(StorageKey.History, '[] also broken');

    expect(() => initializeAppStorage()).not.toThrow();
    expect(appStorage.get(StorageKey.Settings)?.goals).toHaveLength(5);
    expect(appStorage.get(StorageKey.History)?.sessions).toEqual([]);
  });
});
