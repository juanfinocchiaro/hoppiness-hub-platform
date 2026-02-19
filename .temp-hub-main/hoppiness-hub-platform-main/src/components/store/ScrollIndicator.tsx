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
      "fixed bottom-32 inset-x-0 flex justify-center z-20 pointer-events-none",
      className
    )}>
      <div className="flex flex-col items-center gap-0.5 bg-background/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border animate-[pulse_4s_ease-in-out_infinite]">
        <span className="text-xs text-muted-foreground font-medium">Deslizá para ver más</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground animate-[bounce_2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
