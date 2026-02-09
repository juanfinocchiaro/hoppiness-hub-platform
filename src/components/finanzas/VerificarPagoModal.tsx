import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';

interface VerificarPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: any;
}

export function VerificarPagoModal({ open, onOpenChange, pago }: VerificarPagoModalProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notas, setNotas] = useState('');

  const verificar = useMutation({
    mutationFn: async (aprobado: boolean) => {
      if (aprobado) {
        const { error } = await supabase
          .from('pagos_canon')
          .update({
            verificado: true,
            verificado_por: user?.id,
            verificado_at: new Date().toISOString(),
            verificado_notas: notas || null,
          })
          .eq('id', pago.id);
        if (error) throw error;
      } else {
        // Reject = soft delete the payment
        const { error } = await supabase
          .from('pagos_canon')
          .update({
            deleted_at: new Date().toISOString(),
            verificado_notas: `RECHAZADO: ${notas}`,
          })
          .eq('id', pago.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos-canon'] });
      qc.invalidateQueries({ queryKey: ['canon-liquidaciones'] });
      toast.success('Pago procesado');
      onOpenChange(false);
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verificar Pago de Canon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-md bg-muted text-sm space-y-1">
            <p>Monto: <strong className="font-mono">$ {Number(pago.monto).toLocaleString('es-AR')}</strong></p>
            <p>Fecha: <strong>{new Date(pago.fecha_pago).toLocaleDateString('es-AR')}</strong></p>
            <p>Medio: <strong>{pago.medio_pago}</strong></p>
            {pago.referencia && <p>Referencia: <strong>{pago.referencia}</strong></p>}
            {pago.observaciones && <p className="text-muted-foreground">{pago.observaciones}</p>}
          </div>

          <div>
            <Label>Notas de verificación</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Opcional" />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              onClick={() => verificar.mutate(false)}
              disabled={verificar.isPending}
              className="gap-1"
            >
              <XCircle className="w-4 h-4" /> Rechazar
            </Button>
            <Button
              onClick={() => verificar.mutate(true)}
              disabled={verificar.isPending}
              className="gap-1"
            >
              <CheckCircle className="w-4 h-4" /> Aprobar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
