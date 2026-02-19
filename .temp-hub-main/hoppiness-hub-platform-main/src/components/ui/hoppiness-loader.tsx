import { cn } from '@/lib/utils';
import logoLoader from '@/assets/logo-hoppiness-loader.png';
import { useEffect, useState } from 'react';

interface HoppinessLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-16 h-16 md:w-20 md:h-20',
  lg: 'w-28 h-28 md:w-40 md:h-40',
};

export function HoppinessLoader({ 
  size = 'md', 
  text = 'Cargando',
  fullScreen = false,
  className 
}: HoppinessLoaderProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (size === 'sm') return; // No animate dots for small size
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(interval);
  }, [size]);

  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-4',
      fullScreen && 'min-h-screen bg-background',
      className
    )}>
      {/* Logo container with rotation animation */}
      <div className={cn(
        'relative',
        sizeMap[size]
      )}>
        {/* Rotating logo */}
        <img 
          src={logoLoader} 
          alt="Cargando" 
          className="w-full h-full object-contain rounded-full animate-[spin_3s_linear_infinite]"
        />
        
        {/* Animated outer ring */}
        <div className={cn(
          'absolute -inset-2 rounded-full border-2 border-primary/20',
          'animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]',
          size === 'sm' && '-inset-1 border'
        )} />
        
        {/* Static inner glow */}
        <div className={cn(
          'absolute inset-0 rounded-full',
          'bg-primary/5 animate-pulse'
        )} />
      </div>
      
      {/* Loading text with animated dots */}
      {size !== 'sm' && text && (
        <p className={cn(
          'text-muted-foreground font-medium',
          size === 'lg' ? 'text-base' : 'text-sm'
        )}>
          {text}<span className="inline-block w-6 text-left">{dots}</span>
        </p>
      )}
    </div>
  );
}

export default HoppinessLoader;
