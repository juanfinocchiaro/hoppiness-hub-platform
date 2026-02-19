/**
 * RegisterPage - Apertura y cierre de turno de caja (Fase 2)
 * Ingresos/egresos manuales y alivio (Fase 5)
 */
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Receipt, Wallet } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  useCashRegisters,
  useCashMovements,
  useCloseShift,
  useAddMovement,
  calculateExpectedCash,
} from '@/hooks/useCashRegister';
import { useShiftStatus } from '@/hooks/useShiftStatus';
import { RegisterOpenModal } from '@/components/pos/RegisterOpenModal';
import { ManualIncomeModal } from '@/components/pos/ManualIncomeModal';
import { QuickExpenseModal } from '@/components/pos/QuickExpenseModal';
import { CashierDiscrepancyStats } from '@/components/pos/CashierDiscrepancyStats';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cashRegisterKeys } from '@/hooks/useCashRegister';

export default function RegisterPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAlivioModal, setShowAlivioModal] = useState(false);
  const [alivioAmount, setAlivioAmount] = useState('');
  const [alivioNotes, setAlivioNotes] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const { data: registersData, isLoading: loadingRegisters } = useCashRegisters(branchId);
  const registers = registersData?.active ?? [];

  const shiftStatus = useShiftStatus(branchId);
  const activeShift = shiftStatus.activeCashShift;

  const shiftIdForMovements = activeShift?.id ?? null;
  const { data: movements = [] } = useCashMovements(shiftIdForMovements ?? undefined);

  const expectedCash = useMemo(
    () => (activeShift ? calculateExpectedCash(activeShift, movements) : 0),
    [activeShift, movements]
  );

  const closeShiftMutation = useCloseShift(branchId ?? '');
  const addMovement = useAddMovement(branchId ?? '');

  const handleOpenCash = () => setShowOpenModal(true);
  const handleCloseCash = () => setShowCloseModal(true);

  const handleAlivio = async () => {
    if (!user || !activeShift || !alivioAmount) return;
    const amount = parseFloat(alivioAmount);
    if (amount <= 0 || amount > expectedCash) {
      toast.error('Monto inválido');
      return;
    }

    const reliefRegister = registers.find((r) => r.name.toLowerCase().includes('alivio'));
    const cajaOrigen = registers.find((r) => r.id === activeShift.cash_register_id)?.name || 'Caja';
    const cajaDestino = reliefRegister?.name || 'Caja de Alivio';

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('cash_register_movements')
        .select('*', { count: 'exact', head: true })
        .eq('shift_id', activeShift.id)
        .eq('type', 'withdrawal')
        .ilike('concept', '%alivio%');
      const alivioNum = (count || 0) + 1;

      await addMovement.mutateAsync({
        shiftId: activeShift.id,
        type: 'withdrawal',
        amount,
        concept: `Alivio a ${cajaDestino}${alivioNotes ? ` - ${alivioNotes}` : ''} (Nº ${alivioNum})`,
        paymentMethod: 'efectivo',
        userId: user.id,
      });

      if (reliefRegister) {
        const { data: reliefShift } = await supabase
          .from('cash_register_shifts')
          .select('id')
          .eq('cash_register_id', reliefRegister.id)
          .eq('status', 'open')
          .limit(1)
          .maybeSingle();
        if (reliefShift) {
          await addMovement.mutateAsync({
            shiftId: reliefShift.id,
            type: 'deposit',
            amount,
            concept: `Alivio desde ${cajaOrigen}`,
            paymentMethod: 'efectivo',
            userId: user.id,
          });
        }
      }

      toast.success(`Alivio realizado: $ ${amount.toLocaleString('es-AR')}`);
      setShowAlivioModal(false);
      setAlivioAmount('');
      setAlivioNotes('');
      queryClient.invalidateQueries({ queryKey: cashRegisterKeys.all });
    } catch (e: any) {
      toast.error(e?.message || 'Error al realizar alivio');
    }
  };

  const handleConfirmClose = async () => {
    if (!user || !activeShift) return;
    const counted = parseFloat(closingAmount) || 0;
    const difference = counted - expectedCash;
    await closeShiftMutation.mutateAsync({
      shiftId: activeShift.id,
      userId: user.id,
      closingAmount: counted,
      expectedAmount: expectedCash,
      notes: closingNotes.trim() || undefined,
    });
    setClosingAmount('');
    setClosingNotes('');
    setShowCloseModal(false);
    shiftStatus.refetch();
    // El trigger automáticamente registrará la discrepancia en cashier_discrepancy_history
  };

  const isLoading = loadingRegisters || shiftStatus.loading;

  if (isLoading && !shiftStatus.hasChecked) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Caja" subtitle="Turno de caja" />

      <RegisterOpenModal
        open={showOpenModal}
        onOpenChange={setShowOpenModal}
        branchId={branchId!}
        onOpened={() => shiftStatus.refetch()}
      />

      <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Monto esperado (calculado)</Label>
              <p className="text-2xl font-semibold mt-1">
                $ {expectedCash.toLocaleString('es-AR')}
              </p>
            </div>
            <div>
              <Label>Monto contado</Label>
              <Input
                type="number"
                placeholder="0"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Motivo de diferencia..."
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmClose}
              disabled={closeShiftMutation.isPending || closingAmount === ''}
            >
              Cerrar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManualIncomeModal
        open={showIncomeModal}
        onOpenChange={setShowIncomeModal}
        branchId={branchId!}
        shiftId={activeShift?.id}
      />
      <QuickExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        branchId={branchId!}
        shiftId={activeShift?.id}
      />

      <Dialog open={showAlivioModal} onOpenChange={setShowAlivioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hacer Alivio</DialogTitle>
            <DialogDescription>
              Transferir efectivo a Caja de Alivio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Efectivo disponible</p>
              <p className="text-2xl font-bold">$ {expectedCash.toLocaleString('es-AR')}</p>
            </div>
            <div>
              <Label>Monto a aliviar</Label>
              <Input
                type="number"
                placeholder="0"
                value={alivioAmount}
                onChange={(e) => setAlivioAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            {parseFloat(alivioAmount) > expectedCash && (
              <p className="text-xs text-destructive">El monto supera el efectivo disponible</p>
            )}
            <div>
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Ej: Alivio de mediodía"
                value={alivioNotes}
                onChange={(e) => setAlivioNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlivioModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAlivio}
              disabled={!alivioAmount || parseFloat(alivioAmount) <= 0 || parseFloat(alivioAmount) > expectedCash || addMovement.isPending}
            >
              Confirmar Alivio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {shiftStatus.hasCashOpen && activeShift ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default">Caja abierta</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Abierta el {new Date(activeShift.opened_at).toLocaleString('es-AR')}
                </p>
                <p className="text-sm mt-1">
                  Fondo apertura: $ {Number(activeShift.opening_amount).toLocaleString('es-AR')}
                </p>
                <p className="text-sm font-medium mt-2">
                  Efectivo esperado: $ {expectedCash.toLocaleString('es-AR')}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setShowIncomeModal(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Ingreso
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowExpenseModal(true)}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Egreso
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAlivioModal(true)}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Alivio
                  </Button>
                </div>
                <Button variant="destructive" onClick={handleCloseCash} disabled={closeShiftMutation.isPending}>
                  Cerrar caja
                </Button>
              </div>
            </div>
            {movements.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Últimos movimientos</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {movements.slice(0, 5).map((m) => (
                    <li key={m.id}>
                      {m.type === 'income' || m.type === 'deposit' ? '+' : '-'} $ {Number(m.amount).toLocaleString('es-AR')} — {m.concept}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {shiftStatus.hasCashOpen && activeShift && user && (
        <CashierDiscrepancyStats
          userId={user.id}
          branchId={branchId}
          showCurrentDiscrepancy={false}
        />
      )}

      {!shiftStatus.hasCashOpen ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">No hay caja abierta</p>
            <p className="text-sm mb-4">
              Abrí la caja para poder registrar cobros en el POS.
            </p>
            <Button onClick={handleOpenCash} disabled={registers.length === 0}>
              Abrir caja
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
