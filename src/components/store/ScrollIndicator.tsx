import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollIndicatorProps {
  show?: boolean;
  className?: string;
}

export function ScrollIndicator({ show = true, className }: ScrollIndicatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // Hide after scrolling more than 100px
      if (scrollY > 100) {
        setIsVisible(false);
        setHasScrolled(true);
      } else if (!hasScrolled) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolled]);

  if (!show || !isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none",
      "animate-[bounce_3s_ease-in-out_infinite] transition-opacity duration-300",
      className
    )}>
      <div className="flex flex-col items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md border">
        <span className="text-xs text-muted-foreground font-medium">Deslizá para ver más</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}
