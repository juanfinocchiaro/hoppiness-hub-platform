import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullProgress: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  pullProgress,
  isRefreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 5 && !isRefreshing) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200 overflow-hidden"
      style={{ 
        height: isRefreshing ? 48 : Math.min(pullDistance, threshold * 1.2),
        opacity: Math.min(pullProgress * 2, 1)
      }}
    >
      <div className={cn(
        "flex items-center justify-center w-10 h-10 rounded-full bg-background shadow-lg border transition-transform",
        isRefreshing && "animate-spin"
      )}
      style={{
        transform: `rotate(${pullProgress * 360}deg) scale(${0.5 + pullProgress * 0.5})`
      }}
      >
        <RefreshCw className={cn(
          "w-5 h-5 text-primary",
          pullProgress >= 1 && "text-primary"
        )} />
      </div>
    </div>
  );
}
