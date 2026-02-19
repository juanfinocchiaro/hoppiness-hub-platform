import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestrictedFieldProps {
  label: string;
  value: string | null | undefined;
  canView: boolean;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Displays a field value or a locked indicator if the user doesn't have permission
 */
export function RestrictedField({ label, value, canView, icon, className }: RestrictedFieldProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label}:</span>
      {canView ? (
        <span className={cn(!value && "text-muted-foreground")}>{value || '-'}</span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground italic">
          <Lock className="h-3 w-3" />
          Restringido
        </span>
      )}
    </div>
  );
}

/**
 * Section header with lock icon for restricted areas
 */
export function RestrictedSectionHeader({ title, isRestricted }: { title: string; isRestricted: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
      {title}
      {isRestricted && <Lock className="h-3 w-3" />}
    </div>
  );
}
