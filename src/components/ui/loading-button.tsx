import { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Botón con estado de carga integrado.
 * Muestra spinner y deshabilita el botón mientras loading=true.
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading = false, loadingText, children, disabled, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
