import { Redirect } from 'expo-router';

export default function IndexRoute() {
  // Keep app launch on an explicit tab route so NativeTabs never paints the first tab first.
  return <Redirect href="./fast" />;
}
