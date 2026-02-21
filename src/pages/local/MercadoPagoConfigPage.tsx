import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { DollarSign, CheckCircle, XCircle, Loader2, Unplug, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useMercadoPagoConfig, useMercadoPagoConfigMutations } from '@/hooks/useMercadoPagoConfig';
import { Skeleton } from '@/components/ui/skeleton';

export default function MercadoPagoConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: config, isLoading } = useMercadoPagoConfig(branchId);
  const { upsert, testConnection, disconnect } = useMercadoPagoConfigMutations(branchId);

  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (config) {
      setAccessToken(config.access_token);
      setPublicKey(config.public_key);
    }
  }, [config]);

  const isConnected = config?.estado_conexion === 'conectado';
  const hasCredentials = accessToken.trim().length > 0 && publicKey.trim().length > 0;
  const isDirty = config
    ? accessToken !== config.access_token || publicKey !== config.public_key
    : hasCredentials;

  const handleSave = () => {
    upsert.mutate({ access_token: accessToken.trim(), public_key: publicKey.trim() });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MercadoPago"
        subtitle="Configurá la integración con MercadoPago para cobrar online desde la WebApp y con QR en el POS."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Estado de conexión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <Badge className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Conectado
                    </Badge>
                    {config?.collector_id && (
                      <span className="text-sm text-muted-foreground">
                        Collector ID: {config.collector_id}
                      </span>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <XCircle className="w-3.5 h-3.5" />
                    Desconectado
                  </Badge>
                )}
                {config?.ultimo_test && (
                  <span className="text-xs text-muted-foreground">
                    Último test: {new Date(config.ultimo_test).toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>Credenciales</CardTitle>
              <CardDescription>
                Obtené tus credenciales desde el{' '}
                <a
                  href="https://www.mercadopago.com.ar/developers/panel/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  Panel de Desarrolladores <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Access Token (Producción)</Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="APP_USR-..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Se usa en el servidor para crear preferencias de pago. Nunca se expone al cliente.</p>
              </div>

              <div className="space-y-2">
                <Label>Public Key (Producción)</Label>
                <Input
                  placeholder="APP_USR-..."
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Se usa en el frontend para inicializar el SDK de MercadoPago.</p>
              </div>

              <Separator />

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || !hasCredentials || upsert.isPending}
                >
                  {upsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar credenciales
                </Button>

                {hasCredentials && !isDirty && (
                  <Button
                    variant="outline"
                    onClick={() => testConnection.mutate()}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Probar conexión
                  </Button>
                )}

                {isConnected && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        <Unplug className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Desconectar MercadoPago?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán las credenciales y se deshabilitará el cobro online. Podés volver a conectarte en cualquier momento.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => disconnect.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sí, desconectar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Info */}
          <Card>
            <CardHeader>
              <CardTitle>¿Cómo funciona?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground">Tienda Online (WebApp)</p>
                <p>Los clientes podrán pagar sus pedidos online con MercadoPago Checkout Pro. El pedido se crea automáticamente al confirmarse el pago.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Punto de Venta (QR)</p>
                <p>Podés usar MercadoPago QR como método de pago en el POS. El cobro se registra manualmente.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Notificaciones</p>
                <p>Los pagos se confirman automáticamente vía webhook. El estado del pedido se actualiza en tiempo real.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
