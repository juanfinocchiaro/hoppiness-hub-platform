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

export default function ClockInsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { isSuperadmin, local } = usePermissionsV2();
  const [showQRModal, setShowQRModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<Date>(new Date());

  const canManageStaff = isSuperadmin || local.canViewTeam;

  // Obtener info del local
  const { data: branch } = useQuery({
    queryKey: ['branch-clock-info', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, clock_code, allowed_ips')
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
    ? `${window.location.origin}/fichaje/${branch.clock_code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(clockUrl);
    toast.success('Link copiado al portapapeles');
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Fichaje - ${branch?.name}</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui; }
              h1 { margin-bottom: 20px; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h1>Fichaje - ${branch?.name}</h1>
            <div id="qr"></div>
            <p style="margin-top: 20px;">Escaneá para fichar</p>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <script>
              QRCode.toCanvas(document.createElement('canvas'), '${clockUrl}', { width: 300 }, function(err, canvas) {
                document.getElementById('qr').appendChild(canvas);
                setTimeout(() => { window.print(); window.close(); }, 500);
              });
            </script>
          </body>
        </html>
      `);
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
                          <QRCodeSVG value={clockUrl} size={200} />
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