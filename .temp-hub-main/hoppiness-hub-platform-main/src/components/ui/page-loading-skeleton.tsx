import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';

interface PageLoadingSkeletonProps {
  /** Variant determines the layout of the skeleton */
  variant?: 'default' | 'cards' | 'table' | 'list' | 'dashboard';
  /** Custom message shown under the loader */
  message?: string;
  /** Show branded loader instead of skeletons */
  branded?: boolean;
}

/**
 * Unified loading skeleton for all pages.
 * Centers content and provides consistent loading experience.
 */
export function PageLoadingSkeleton({ 
  variant = 'default', 
  message,
  branded = true 
}: PageLoadingSkeletonProps) {
  if (branded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <HoppinessLoader size="md" text={message || 'Cargando'} />
      </div>
    );
  }

  // Skeleton variants for cases where branded loader doesn't fit
  switch (variant) {
    case 'dashboard':
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      );
    
    case 'cards':
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    
    case 'table':
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      );
    
    case 'list':
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      );
    
    default:
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
  }
}
