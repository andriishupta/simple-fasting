import {
  appStorage,
  createEmptyGraphCacheState,
  StorageKey,
  type GraphCacheState,
} from '@/storage/app-storage';

const now = (): string => new Date().toISOString();

export const getGraphCacheState = (): GraphCacheState =>
  appStorage.getOrDefault(StorageKey.GraphCache, createEmptyGraphCacheState(now()));

export const saveGraphCacheState = (graphCacheState: GraphCacheState): void =>
  appStorage.insert(StorageKey.GraphCache, graphCacheState);

export const clearGraphCacheState = (): GraphCacheState => {
  const graphCacheState = createEmptyGraphCacheState(now());

  saveGraphCacheState(graphCacheState);

  return graphCacheState;
};
