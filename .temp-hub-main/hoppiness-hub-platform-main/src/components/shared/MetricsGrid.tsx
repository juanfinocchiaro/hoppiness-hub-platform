import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface Metric {
  id: string;
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

interface MetricsGridProps {
  metrics: Metric[];
  isLoading?: boolean;
  columns?: 2 | 3 | 4 | 6;
}

const variantStyles = {
  default: 'bg-muted/50',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  danger: 'bg-destructive/20 text-destructive',
};

const variantIconStyles = {
  default: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

/**
 * Unified metrics grid component for dashboards.
 * Supports loading state, different variants, and responsive columns.
 */
export function MetricsGrid({ metrics, isLoading, columns = 4 }: MetricsGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    6: 'md:grid-cols-3 lg:grid-cols-6',
  };

  if (isLoading) {
    return (
      <div className={cn('grid gap-4', gridCols[columns])}>
        {Array(columns).fill(0).map((_, i) => (
          <Card key={i} className="min-h-[100px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns])}>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const variant = metric.variant || 'default';
        
        return (
          <Card key={metric.id} className="min-h-[100px]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', variantStyles[variant])}>
                <Icon className={cn('h-5 w-5', variantIconStyles[variant])} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.sublabel && (
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.sublabel}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
