import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        validated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400',
        info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
        warning: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      },
    },
    defaultVariants: {
      variant: 'inactive',
    },
  }
);

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
}

/**
 * Badge de estado con variantes de color semánticas.
 */
export function StatusBadge({
  className,
  variant,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}
