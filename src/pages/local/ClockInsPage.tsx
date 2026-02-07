/**
 * ClockInsPage - Fichajes del personal con QR
 * 
 * Muestra:
 * - Link/QR para fichar en este local
 * - Fichajes del día
 * - Historial con filtros
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, ExternalLink, QrCode, Clock, LogIn, LogOut, User, Calendar, Printer, AlertTriangle } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { getClockInUrl } from '@/lib/constants';

export default function ClockInsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isSuperadmin, local } = usePermissionsV2(branchId);
  const [showQRModal, setShowQRModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date>(new Date());

  const canManageStaff = isSuperadmin || local.canViewTeam;

  // Obtener info del local
  const { data: branch } = useQuery({
    queryKey: ['branch-clock-info', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, clock_code')
        .eq('id', branchId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Obtener fichajes del día
  const { data: todayEntries = [] } = useQuery({
    queryKey: ['clock-entries-today', branchId],
    queryFn: async () => {
      const today = new Date();
      const { data, error } = await supabase
        .from('clock_entries')
        .select('id, entry_type, photo_url, created_at, user_id')
        .eq('branch_id', branchId)
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles separately (profiles.id = user_id after migration)
      const userIds = [...new Set(data?.map(e => e.user_id) || [])];
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
      
      return data?.map(entry => ({
        ...entry,
        user_name: profileMap.get(entry.user_id) || 'Usuario'
      })) || [];
    },
    enabled: !!branchId,
    refetchInterval: 30000,
  });

  // Obtener historial de fichajes
  const { data: historyEntries = [] } = useQuery({
    queryKey: ['clock-entries-history', branchId, dateFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clock_entries')
        .select('id, entry_type, photo_url, created_at, user_id')
        .eq('branch_id', branchId)
        .gte('created_at', startOfDay(dateFilter).toISOString())
        .lte('created_at', endOfDay(dateFilter).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const userIds = [...new Set(data?.map(e => e.user_id) || [])];
      if (userIds.length === 0) return [];
      
      // profiles.id = user_id after migration
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]));
      
      return data?.map(entry => ({
        ...entry,
        user_name: profileMap.get(entry.user_id) || 'Usuario'
      })) || [];
    },
    enabled: !!branchId,
  });

  if (!branchId) return null;

  const clockUrl = branch?.clock_code 
    ? getClockInUrl(branch.clock_code)
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(clockUrl);
    toast.success('Link copiado al portapapeles');
  };

  const printQR = () => {
    try {
      const qrSvg = document.querySelector('#print-qr-svg') as SVGElement | null;
      if (!qrSvg) {
        toast.error('No se pudo generar el QR para imprimir');
        return;
      }

      // Clone and set proper dimensions without forcing viewBox
      const svgClone = qrSvg.cloneNode(true) as SVGElement;
      svgClone.setAttribute('width', '280');
      svgClone.setAttribute('height', '280');
      svgClone.removeAttribute('id');

      const svgData = new XMLSerializer().serializeToString(svgClone);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('El navegador bloqueó la ventana de impresión');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Fichaje - ${branch?.name}</title>
            <style>
              @page { margin: 1.5cm; }
              * { box-sizing: border-box; }
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                margin: 0;
                padding: 40px 20px;
                background: #fff;
                color: #1a1a1a;
              }
              .card {
                background: #fff;
                border: 2px solid #e5e7eb;
                border-radius: 24px;
                padding: 48px 40px;
                max-width: 420px;
                width: 100%;
                text-align: center;
              }
              .logo {
                font-size: 32px;
                font-weight: 800;
                letter-spacing: -1px;
                color: #1a1a1a;
                margin-bottom: 8px;
              }
              .logo span {
                color: #f59e0b;
              }
              .subtitle {
                font-size: 14px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 24px;
              }
              .branch-name {
                display: inline-block;
                background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                padding: 10px 28px;
                border-radius: 24px;
                font-size: 18px;
                font-weight: 700;
                color: #92400e;
                margin-bottom: 32px;
              }
              .qr-container {
                background: #fff;
                padding: 20px;
                border: 3px solid #1a1a1a;
                border-radius: 16px;
                display: inline-block;
                margin-bottom: 28px;
              }
              .qr-container svg {
                display: block;
              }
              .instructions {
                margin-bottom: 8px;
              }
              .instructions h2 {
                font-size: 22px;
                font-weight: 700;
                margin: 0 0 4px;
                color: #1a1a1a;
              }
              .instructions p {
                font-size: 16px;
                color: #6b7280;
                margin: 0;
              }
              .divider {
                width: 60px;
                height: 3px;
                background: #f59e0b;
                margin: 24px auto;
                border-radius: 2px;
              }
              .url {
                font-size: 11px;
                color: #9ca3af;
                word-break: break-all;
                font-family: monospace;
              }
              @media print {
                body { padding: 0; }
                .card { border: none; box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">HOPPI<span>NESS</span></div>
              <div class="subtitle">Control de Asistencia</div>
              <div class="branch-name">${branch?.name || 'Local'}</div>
              <div class="qr-container">${svgData}</div>
              <div class="instructions">
                <h2>Escaneá para fichar</h2>
                <p>Ingreso / Egreso</p>
              </div>
              <div class="divider"></div>
              <div class="url">${clockUrl}</div>
            </div>
            <script>
              setTimeout(() => { window.print(); }, 250);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      if (import.meta.env.DEV) console.error(e);
      toast.error('Error al generar la impresión del QR');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fichajes</h1>
        <p className="text-muted-foreground">Control de asistencia del personal</p>
      </div>

      {/* Link de fichaje */}
      {canManageStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Link de Fichaje para este Local</CardTitle>
            <CardDescription>
              Compartí este link o imprimí el QR para que tu equipo pueda fichar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branch?.clock_code ? (
              <>
                <div className="flex gap-2">
                  <Input value={clockUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={clockUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <QrCode className="w-4 h-4 mr-2" />
                        Ver QR
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>QR de Fichaje - {branch?.name}</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-4 py-4">
                        <div className="bg-white p-4 rounded-lg">
                          <QRCodeSVG id="print-qr-svg" value={clockUrl} size={200} />
                        </div>
                        <p className="text-muted-foreground text-sm">Escaneá para fichar</p>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={printQR}>
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">Este local no tiene código de fichaje configurado</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Hoy / Historial */}
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">
            <Clock className="w-4 h-4 mr-2" />
            Hoy
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fichajes de Hoy</CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayEntries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay fichajes registrados hoy
                </p>
              ) : (
                <div className="space-y-3">
                  {todayEntries.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{entry.user_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge 
                            variant={entry.entry_type === 'clock_in' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {entry.entry_type === 'clock_in' ? (
                              <><LogIn className="w-3 h-3 mr-1" /> Entrada</>
                            ) : (
                              <><LogOut className="w-3 h-3 mr-1" /> Salida</>
                            )}
                          </Badge>
                          <span>{format(new Date(entry.created_at), 'HH:mm')}</span>
                        </div>
                      </div>
                      {entry.photo_url && (
                        <img 
                          src={entry.photo_url} 
                          alt="Foto"
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Input
              type="date"
              value={format(dateFilter, 'yyyy-MM-dd')}
              onChange={(e) => setDateFilter(new Date(e.target.value))}
              className="w-auto"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDateFilter(subDays(dateFilter, 1))}
            >
              Día anterior
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Fichajes del {format(dateFilter, "d 'de' MMMM", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyEntries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay fichajes para esta fecha
                </p>
              ) : (
                <div className="space-y-3">
                  {historyEntries.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{entry.user_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge 
                            variant={entry.entry_type === 'clock_in' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {entry.entry_type === 'clock_in' ? 'Entrada' : 'Salida'}
                          </Badge>
                          <span>{format(new Date(entry.created_at), 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}