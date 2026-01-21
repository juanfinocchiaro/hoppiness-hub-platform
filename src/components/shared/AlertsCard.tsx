import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface AlertsCardProps {
  alerts: Alert[];
  className?: string;
}

const alertStyles = {
  error: 'bg-destructive/10 border-destructive/30',
  warning: 'bg-warning/10 border-warning/30',
  info: 'bg-primary/10 border-primary/30',
};

const alertIconStyles = {
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
};

const AlertIcon = ({ type }: { type: Alert['type'] }) => {
  const icons = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
  const Icon = icons[type];
  return <Icon className={cn('h-4 w-4 shrink-0', alertIconStyles[type])} />;
};

/**
 * Unified alerts card component for dashboards.
 * Shows important notifications that need attention.
 */
export function AlertsCard({ alerts, className }: AlertsCardProps) {
  if (alerts.length === 0) return null;
  
  return (
    <Card className={cn('border-warning/30 bg-warning/5', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <CardTitle className="text-sm font-medium">Alertas</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              'flex items-center justify-between gap-3 p-3 rounded-lg border',
              alertStyles[alert.type]
            )}
          >
            <div className="flex items-center gap-3">
              <AlertIcon type={alert.type} />
              <span className="text-sm">{alert.message}</span>
            </div>
            {alert.action && (
              <div className="shrink-0">
                {alert.action.href ? (
                  <Link to={alert.action.href}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      {alert.action.label}
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={alert.action.onClick}
                  >
                    {alert.action.label}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
