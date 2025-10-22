import { Redirect } from 'expo-router';

export default function RootRedirect() {
  // Redirect all users to main app - authentication is now optional
  return <Redirect href="/(tabs)" />;
}
