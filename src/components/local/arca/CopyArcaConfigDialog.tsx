import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';

interface CopyArcaConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetBranchId: string;
  onCopied: () => void;
}

export function CopyArcaConfigDialog({ open, onOpenChange, targetBranchId, onCopied }: CopyArcaConfigDialogProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [puntoVenta, setPuntoVenta] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const queryClient = useQueryClient();

  // Fetch branches with ARCA configured (excluding current)
  const { data: configuredBranches, isLoading } = useQuery({
    queryKey: ['arca-configured-branches', targetBranchId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('afip_config' as any)
        .select('branch_id, cuit, razon_social, punto_venta, estado_conexion, certificado_crt, clave_privada_enc')
        .not('certificado_crt', 'is', null)
        .not('clave_privada_enc', 'is', null)
        .neq('branch_id', targetBranchId) as any);
      if (error) throw error;

      // Get branch names
      const branchIds = (data as any[]).map((d: any) => d.branch_id);
      if (!branchIds.length) return [];

      const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);

      return (data as any[]).map((cfg: any) => ({
        ...cfg,
        branch_name: branches?.find((b) => b.id === cfg.branch_id)?.name || 'Sin nombre',
      }));
    },
    enabled: open,
  });

  const handleCopy = async () => {
    if (!selectedBranchId || !puntoVenta) {
      toast.error('Seleccioná una sucursal y escribí el punto de venta');
      return;
    }

    const source = configuredBranches?.find((b: any) => b.branch_id === selectedBranchId);
    if (!source) return;

    setIsCopying(true);
    try {
      const payload = {
        branch_id: targetBranchId,
        cuit: source.cuit,
        razon_social: source.razon_social,
        certificado_crt: source.certificado_crt,
        clave_privada_enc: source.clave_privada_enc,
        punto_venta: parseInt(puntoVenta),
        estado_certificado: 'certificado_subido',
        estado_conexion: 'sin_configurar',
      };

      // Check if config exists
      const { data: existing } = await (supabase
        .from('afip_config' as any)
        .select('id')
        .eq('branch_id', targetBranchId)
        .maybeSingle() as any);

      if (existing) {
        const { error } = await (supabase
          .from('afip_config' as any)
          .update(payload)
          .eq('branch_id', targetBranchId) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('afip_config' as any)
          .insert(payload) as any);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['afip-config', targetBranchId] });
      onOpenChange(false);
      onCopied();
    } catch (err: any) {
      toast.error(`Error al copiar: ${err.message}`);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar configuración ARCA</DialogTitle>
          <DialogDescription>
            Copiá el certificado y datos fiscales de otra sucursal. Solo tenés que indicar el nuevo punto de venta.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando sucursales...</p>}

        {!isLoading && (!configuredBranches || configuredBranches.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No hay otras sucursales con ARCA configurado.
          </p>
        )}

        {!isLoading && configuredBranches && configuredBranches.length > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sucursal origen</Label>
              <div className="space-y-2">
                {configuredBranches.map((b: any) => (
                  <button
                    key={b.branch_id}
                    onClick={() => setSelectedBranchId(b.branch_id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedBranchId === b.branch_id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{b.branch_name}</p>
                        <p className="text-xs text-muted-foreground">CUIT: {b.cuit} · PV: {b.punto_venta}</p>
                      </div>
                      {selectedBranchId === b.branch_id && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copy-pv">Punto de Venta para esta sucursal</Label>
              <Input
                id="copy-pv"
                type="number"
                min={1}
                placeholder="Ej: 2"
                value={puntoVenta}
                onChange={(e) => setPuntoVenta(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cada sucursal debe tener un punto de venta diferente en ARCA
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleCopy}
            disabled={!selectedBranchId || !puntoVenta || isCopying}
          >
            {isCopying ? 'Copiando...' : 'Copiar y probar conexión'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
