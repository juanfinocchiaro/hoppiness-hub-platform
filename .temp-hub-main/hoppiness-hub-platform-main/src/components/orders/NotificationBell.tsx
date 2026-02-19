import { useState } from 'react';
import { Bell, Volume2, VolumeX, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useOrderNotifications } from './OrderNotificationProvider';
import { usePendingOrdersCount } from '@/hooks/usePendingOrdersCount';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  branchId: string;
}

export function NotificationBell({ branchId }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pendingCount = usePendingOrdersCount(branchId);
  
  const { 
    soundEnabled, 
    setSoundEnabled, 
    browserNotificationsEnabled,
    requestBrowserPermission,
  } = useOrderNotifications();

  const handleGoToIntegrator = () => {
    setOpen(false);
    navigate(`/local/${branchId}/integrador`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Notificaciones de pedidos"
        >
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] flex items-center justify-center text-xs px-1 animate-pulse"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Notificaciones</h4>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Pending orders info */}
          {pendingCount > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Tenés {pendingCount} pedido{pendingCount !== 1 ? 's' : ''} esperando aceptación.
              </p>
              <Button 
                size="sm" 
                className="w-full"
                onClick={handleGoToIntegrator}
              >
                Ir al Integrador
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No hay pedidos pendientes 🎉
            </p>
          )}

          <Separator />

          {/* Notification settings */}
          <div className="space-y-3">
            <h5 className="text-sm font-medium">Configuración</h5>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="sound" className="text-sm">
                  Sonido
                </Label>
              </div>
              <Switch
                id="sound"
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {browserNotificationsEnabled ? (
                  <Bell className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="browser-notif" className="text-sm">
                  Notificaciones del navegador
                </Label>
              </div>
              {browserNotificationsEnabled ? (
                <Badge variant="secondary" className="text-xs">Activo</Badge>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={requestBrowserPermission}
                >
                  Activar
                </Button>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
