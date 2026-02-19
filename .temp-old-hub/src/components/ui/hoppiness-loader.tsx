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
  sm: 'w-8 h-8',
  md: 'w-16 h-16 md:w-20 md:h-20',
  lg: 'w-24 h-24 md:w-32 md:h-32',
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
      {/* Logo container with pulse animation */}
      <div className={cn(
        'relative',
        sizeMap[size]
      )}>
        {/* Pulsing background rings */}
        <div className={cn(
          'absolute inset-0 rounded-full bg-primary/10',
          'animate-ping'
        )} 
        style={{ animationDuration: '2s' }}
        />
        <div className={cn(
          'absolute -inset-2 rounded-full bg-primary/5',
          'animate-pulse'
        )} />
        
        {/* Main logo with subtle scale animation */}
        <img 
          src={logoLoader} 
          alt="Cargando" 
          className={cn(
            'w-full h-full object-contain relative z-10',
            'animate-pulse'
          )}
          style={{ animationDuration: '1.5s' }}
        />
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
