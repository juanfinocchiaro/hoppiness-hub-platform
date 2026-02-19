import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  ShoppingCart, 
  AlertTriangle,
  Users,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  email: boolean;
  push: boolean;
}

const defaultSettings: NotificationSetting[] = [
  {
    id: 'new_order',
    label: 'Nuevo pedido',
    description: 'Cuando llega un pedido nuevo a cualquier sucursal',
    icon: ShoppingCart,
    email: true,
    push: true,
  },
  {
    id: 'order_issue',
    label: 'Problemas con pedidos',
    description: 'Cancelaciones, reclamos o pedidos atrasados',
    icon: AlertTriangle,
    email: true,
    push: true,
  },
  {
    id: 'low_stock',
    label: 'Stock bajo',
    description: 'Cuando un ingrediente está por debajo del mínimo',
    icon: TrendingDown,
    email: true,
    push: false,
  },
  {
    id: 'new_message',
    label: 'Mensajes de contacto',
    description: 'Cuando alguien envía un mensaje desde la web',
    icon: MessageSquare,
    email: true,
    push: false,
  },
  {
    id: 'staff_clock',
    label: 'Fichajes del equipo',
    description: 'Entradas y salidas del personal',
    icon: Users,
    email: false,
    push: false,
  },
];

export default function Notifications() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);

  const toggleSetting = (id: string, channel: 'email' | 'push') => {
    setSettings((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, [channel]: !s[channel] } : s
      )
    );
  };

  const handleSave = () => {
    // TODO: Save to database
    toast.success('Preferencias de notificación guardadas');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notificaciones</h1>
        <p className="text-muted-foreground">
          Configurá cómo y cuándo querés recibir alertas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferencias de notificación
          </CardTitle>
          <CardDescription>
            Elegí qué notificaciones querés recibir por email o push
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-[1fr_80px_80px] gap-4 text-sm font-medium text-muted-foreground">
            <div>Evento</div>
            <div className="text-center">
              <Mail className="h-4 w-4 mx-auto mb-1" />
              Email
            </div>
            <div className="text-center">
              <Bell className="h-4 w-4 mx-auto mb-1" />
              Push
            </div>
          </div>

          <Separator />

          {settings.map((setting) => (
            <div
              key={setting.id}
              className="grid grid-cols-[1fr_80px_80px] gap-4 items-center"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <setting.icon className="h-4 w-4" />
                </div>
                <div>
                  <Label className="font-medium">{setting.label}</Label>
                  <p className="text-sm text-muted-foreground">
                    {setting.description}
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={setting.email}
                  onCheckedChange={() => toggleSetting(setting.id, 'email')}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={setting.push}
                  onCheckedChange={() => toggleSetting(setting.id, 'push')}
                />
              </div>
            </div>
          ))}

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSave}>Guardar preferencias</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
