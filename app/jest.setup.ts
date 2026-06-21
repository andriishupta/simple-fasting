const mockValues = new Map<string, string>();
const mockListeners = new Set<(key: string) => void>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    set: (key: string, value: string) => {
      mockValues.set(key, value);
      mockListeners.forEach((listener) => listener(key));
    },
    getString: (key: string) => mockValues.get(key),
    remove: (key: string) => {
      mockValues.delete(key);
      mockListeners.forEach((listener) => listener(key));
    },
    clearAll: () => {
      const keys = [...mockValues.keys()];
      mockValues.clear();
      keys.forEach((key) => mockListeners.forEach((listener) => listener(key)));
    },
    addOnValueChangedListener: (listener: (key: string) => void) => {
      mockListeners.add(listener);
      return { remove: () => mockListeners.delete(listener) };
    },
  }),
}));

beforeEach(() => {
  mockValues.clear();
  mockListeners.clear();
});
