import { cn } from '@/lib/utils';

interface PriceProps {
  value: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  muted?: boolean;
  accent?: boolean;
  success?: boolean;
  strikethrough?: boolean;
  prefix?: string;
  className?: string;
}

const sizeClasses: Record<NonNullable<PriceProps['size']>, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export function Price({
  value,
  size = 'sm',
  muted,
  accent,
  success,
  strikethrough,
  prefix = '$',
  className,
}: PriceProps) {
  return (
    <span
      className={cn(
        'font-mono tabular-nums font-semibold',
        sizeClasses[size],
        muted && 'text-muted-foreground font-normal',
        accent && 'text-accent',
        success && 'text-success',
        strikethrough && 'line-through opacity-60',
        className,
      )}
    >
      {prefix} {value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
    </span>
  );
}
