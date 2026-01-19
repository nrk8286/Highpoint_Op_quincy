'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import type { UserRole } from '@/lib/types';
import { Logo } from '@/components/logo';

interface WithAuthProps {
  allowedRoles: UserRole[];
}

const withAuth = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  { allowedRoles }: WithAuthProps
) => {
  const WithAuthComponent = (props: P) => {
    const { user, loading, isAuthenticated } = useUser();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.replace('/login');
        return;
      }

      if (!loading && isAuthenticated && user && !allowedRoles.includes(user.role)) {
        router.replace('/unauthorized'); // Or a generic 'not found' page
      }
    }, [loading, isAuthenticated, user, router]);

    if (loading || !isAuthenticated || !user || !allowedRoles.includes(user.role)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
              <div className="animate-pulse">
                <Logo size="xlarge" />
              </div>
            </div>
        );
    }

    return <WrappedComponent {...props} />;
  };

  return WithAuthComponent;
};

export default withAuth;
