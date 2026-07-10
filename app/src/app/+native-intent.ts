const fastTabPath = '/fast';

const rootAppPaths = new Set([
  '',
  '/',
  'simple-fasting:',
  'simple-fasting:/',
  'simple-fasting://',
  'simple-fasting:///',
]);

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return rootAppPaths.has(path.trim()) ? fastTabPath : path;
  } catch {
    return path;
  }
}
