import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Clock, Truck, Store, MessageSquare, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

export default function LocalConfig() {
  const { branchId } = useParams();
  const { branch: contextBranch } = useOutletContext<{ branch: Branch | null }>();
  const { isAdmin, isGerente, branchPermissions } = useUserRole();
  
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [isOpen, setIsOpen] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [estimatedPrepTime, setEstimatedPrepTime] = useState(20);
  const [statusMessage, setStatusMessage] = useState('');

  const currentPermissions = branchPermissions.find(p => p.branch_id === branchId);
  const canEdit = isAdmin || isGerente || currentPermissions?.can_manage_staff;

  const fetchBranch = async () => {
    if (!branchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error) throw error;
      
      setBranch(data);
      // @ts-ignore - new columns might not be in types yet
      setIsOpen(data.is_open ?? true);
      // @ts-ignore
      setDeliveryEnabled(data.delivery_enabled ?? true);
      // @ts-ignore
      setEstimatedPrepTime(data.estimated_prep_time_min ?? 20);
      // @ts-ignore
      setStatusMessage(data.status_message || '');
    } catch (error: any) {
      toast.error('Error al cargar sucursal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranch();
  }, [branchId]);

  const handleSave = async () => {
    if (!canEdit || !branchId) {
      toast.error('No tenés permisos para modificar la configuración');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          is_open: isOpen,
          delivery_enabled: deliveryEnabled,
          estimated_prep_time_min: estimatedPrepTime,
          status_message: statusMessage || null,
        })
        .eq('id', branchId);

      if (error) throw error;
      
      toast.success('Configuración guardada');
      fetchBranch();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">{branch?.name}</p>
      </div>

      {!canEdit && (
        <Card className="bg-muted">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Modo lectura: no tenés permisos para modificar la configuración.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="divide-y">
          {/* Estado del Local */}
          <div className="flex items-center justify-between py-4 first:pt-6">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="is-open" className="text-base font-medium">Local Abierto</Label>
                <p className="text-sm text-muted-foreground">
                  Los clientes pueden hacer pedidos
                </p>
              </div>
            </div>
            <Switch
              id="is-open"
              checked={isOpen}
              onCheckedChange={setIsOpen}
              disabled={!canEdit}
            />
          </div>

          {/* Delivery */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="delivery-enabled" className="text-base font-medium">Delivery Habilitado</Label>
                <p className="text-sm text-muted-foreground">
                  Permite pedidos con envío a domicilio
                </p>
              </div>
            </div>
            <Switch
              id="delivery-enabled"
              checked={deliveryEnabled}
              onCheckedChange={setDeliveryEnabled}
              disabled={!canEdit}
            />
          </div>

          {/* Tiempo de Preparación */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-0.5">
                <Label htmlFor="prep-time" className="text-base font-medium">Tiempo de Preparación</Label>
                <p className="text-sm text-muted-foreground">
                  Tiempo estimado que se muestra a los clientes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="prep-time"
                type="number"
                min={5}
                max={120}
                value={estimatedPrepTime}
                onChange={(e) => setEstimatedPrepTime(Number(e.target.value))}
                disabled={!canEdit}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          {/* Mensaje de Estado */}
          <div className="py-4 last:pb-6">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="space-y-0.5">
                  <Label htmlFor="status-message" className="text-base font-medium">Mensaje de Estado</Label>
                  <p className="text-sm text-muted-foreground">
                    Mensaje opcional para los clientes (ej: "Demora de 15 min extra")
                  </p>
                </div>
                <Textarea
                  id="status-message"
                  placeholder="Escribí un mensaje para los clientes..."
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  disabled={!canEdit}
                  rows={2}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
