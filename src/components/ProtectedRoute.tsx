import { ReactNode } from 'react';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { hasAccess, loading } = useSubscriptionGuard();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-2xl p-8 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }
  
  if (!hasAccess) {
    return null; // Hook já redireciona
  }
  
  return <>{children}</>;
}
