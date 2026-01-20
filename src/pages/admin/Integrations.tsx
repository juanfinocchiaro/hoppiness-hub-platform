import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Link as LinkIcon, 
  CreditCard, 
  Truck, 
  MessageSquare,
  FileText,
  Settings,
  ExternalLink
} from 'lucide-react';

const integrations = [
  {
    id: 'mercadopago',
    name: 'MercadoPago',
    description: 'Pagos online y presenciales con QR',
    icon: CreditCard,
    status: 'connected',
    category: 'Pagos',
  },
  {
    id: 'rappi',
    name: 'Rappi',
    description: 'Recibí pedidos desde Rappi',
    icon: Truck,
    status: 'available',
    category: 'Delivery',
  },
  {
    id: 'pedidosya',
    name: 'PedidosYa',
    description: 'Recibí pedidos desde PedidosYa',
    icon: Truck,
    status: 'available',
    category: 'Delivery',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Notificaciones automáticas a clientes',
    icon: MessageSquare,
    status: 'available',
    category: 'Comunicación',
  },
  {
    id: 'facturante',
    name: 'Facturante',
    description: 'Facturación electrónica AFIP',
    icon: FileText,
    status: 'connected',
    category: 'Facturación',
  },
];

export default function Integrations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground">
          Conectá servicios externos para ampliar las capacidades de tu negocio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <integration.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{integration.name}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">
                      {integration.category}
                    </Badge>
                  </div>
                </div>
                {integration.status === 'connected' ? (
                  <Badge variant="default" className="bg-primary/10 text-primary">
                    Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary">Disponible</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {integration.description}
              </p>
              <div className="flex items-center justify-between">
                {integration.status === 'connected' ? (
                  <>
                    <Switch checked={true} />
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Configurar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" className="w-full">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Conectar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <ExternalLink className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">¿Necesitás otra integración?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Contactanos para solicitar nuevas integraciones
          </p>
          <Button variant="outline">Solicitar integración</Button>
        </CardContent>
      </Card>
    </div>
  );
}
