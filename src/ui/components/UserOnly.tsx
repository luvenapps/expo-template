import { useSessionStore } from '@/auth/session';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

type UserOnlyProps = {
  children: React.ReactNode;
  redirectTo?: Href;
};

export function UserOnly({ children, redirectTo = '/(auth)/login' }: UserOnlyProps) {
  const status = useSessionStore((state) => state.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(redirectTo);
    }
  }, [redirectTo, router, status]);

  if (status !== 'authenticated') {
    return null;
  }

  return <>{children}</>;
}
