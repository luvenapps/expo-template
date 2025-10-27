import { Redirect } from 'expo-router';

export default function RootRedirect() {
  // Always redirect to main app - authentication is optional and accessible from Settings
  return <Redirect href="/(tabs)" />;
}
