import { initializeAppStorage } from '@/storage/storage-migrations';
import { refreshSettingsSnapshot } from '@/repositories/settings-repository';

export const initializeStorage = (): void => {
  initializeAppStorage();
  refreshSettingsSnapshot();
};
