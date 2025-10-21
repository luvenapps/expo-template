import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { useSessionStore } from '@/auth/session';

export default function RootRedirect() {
  const status = useSessionStore((state) => state.status);

  if (status === 'unknown') {
    return null;
  }

  const href: Href = status === 'authenticated' ? '/(tabs)' : ('/(auth)/login' as Href);
  return <Redirect href={href} />;
}
