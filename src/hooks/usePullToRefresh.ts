import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Distance in pixels to trigger refresh
  disabled?: boolean;
}

export function usePullToRefresh({ 
  onRefresh, 
  threshold = 80,
  disabled = false 
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only allow pull when at top of page
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && window.scrollY <= 0) {
      // Apply resistance - pull distance is slower than finger movement
      const resistedDistance = Math.min(diff * 0.5, threshold * 1.5);
      setPullDistance(resistedDistance);
      
      // Prevent scroll when pulling
      if (resistedDistance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Keep some visual feedback
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current || document;
    
    container.addEventListener('touchstart', handleTouchStart as any, { passive: true });
    container.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    container.addEventListener('touchend', handleTouchEnd as any, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart as any);
      container.removeEventListener('touchmove', handleTouchMove as any);
      container.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
  };
}
