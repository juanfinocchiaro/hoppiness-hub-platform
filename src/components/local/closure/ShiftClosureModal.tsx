/**
 * ShiftClosureModal - Main modal for shift closure entry
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { BurgersSection } from './BurgersSection';
import { LocalSalesSection } from './LocalSalesSection';
import { AppSalesSection } from './AppSalesSection';
import { InvoicingSection } from './InvoicingSection';
import { ClosureSummary } from './ClosureSummary';

import {
  useSaveShiftClosure,
  useShiftClosure,
  useEnabledShifts,
  SHIFT_LABELS,
} from '@/hooks/useShiftClosures';
import {
  getDefaultHamburguesas,
  getDefaultVentasLocal,
  getDefaultVentasApps,
  calcularTotalesHamburguesas,
  calcularTotalesVentasLocal,
  calcularTotalesVentasApps,
  calcularFacturacionEsperada,
} from '@/types/shiftClosure';
import type { HamburguesasData, VentasLocalData, VentasAppsData, ShiftType } from '@/types/shiftClosure';

interface ShiftClosureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  defaultShift?: string;
  defaultDate?: Date;
}

export function ShiftClosureModal({
  open,
  onOpenChange,
  branchId,
  branchName,
  defaultShift = 'mediodía',
  defaultDate,
}: ShiftClosureModalProps) {
  const [fecha, setFecha] = useState<Date>(defaultDate || new Date());
  const [turno, setTurno] = useState<ShiftType>(defaultShift as ShiftType);
  const [hamburguesas, setHamburguesas] = useState<HamburguesasData>(getDefaultHamburguesas());
  const [ventasLocal, setVentasLocal] = useState<VentasLocalData>(getDefaultVentasLocal());
  const [ventasApps, setVentasApps] = useState<VentasAppsData>(getDefaultVentasApps());
  const [totalFacturado, setTotalFacturado] = useState(0);
  const [notas, setNotas] = useState('');
  
  // Load enabled shifts
  const { data: enabledShifts } = useEnabledShifts(branchId);
  
  // Load existing closure if any
  const fechaStr = format(fecha, 'yyyy-MM-dd');
  const { data: existingClosure } = useShiftClosure(branchId, fechaStr, turno);
  
  // Save mutation
  const saveMutation = useSaveShiftClosure();
  
  // Populate form with existing data
  useEffect(() => {
    if (existingClosure) {
      setHamburguesas(existingClosure.hamburguesas);
      setVentasLocal(existingClosure.ventas_local);
      setVentasApps(existingClosure.ventas_apps);
      setTotalFacturado(Number(existingClosure.total_facturado) || 0);
      setNotas(existingClosure.notas || '');
    } else {
      // Reset to defaults when switching to a new shift
      setHamburguesas(getDefaultHamburguesas());
      setVentasLocal(getDefaultVentasLocal());
      setVentasApps(getDefaultVentasApps());
      setTotalFacturado(0);
      setNotas('');
    }
  }, [existingClosure, fechaStr, turno]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const totalHamburguesas = calcularTotalesHamburguesas(hamburguesas);
    const totalesLocal = calcularTotalesVentasLocal(ventasLocal);
    const totalesApps = calcularTotalesVentasApps(ventasApps);
    
    const totalVendido = totalesLocal.total + totalesApps.total;
    const totalEfectivo = totalesLocal.efectivo + totalesApps.efectivo;
    const totalDigital = totalesLocal.digital + totalesApps.digital;
    
    // For invoicing calculation
    const efectivoLocal = totalesLocal.efectivo + ventasApps.pedidosya.efectivo;
    const efectivoMasDelivery = ventasApps.mas_delivery.efectivo;
    const facturacionEsperada = calcularFacturacionEsperada(ventasLocal, ventasApps);
    
    return {
      totalHamburguesas,
      subtotalLocal: totalesLocal.total,
      subtotalApps: totalesApps.total,
      totalVendido,
      totalEfectivo,
      totalDigital,
      efectivoLocal,
      efectivoMasDelivery,
      facturacionEsperada,
    };
  }, [hamburguesas, ventasLocal, ventasApps]);
  
  const handleSave = async () => {
    await saveMutation.mutateAsync({
      branch_id: branchId,
      fecha: fechaStr,
      turno,
      hamburguesas,
      ventas_local: ventasLocal,
      ventas_apps: ventasApps,
      total_facturado: totalFacturado,
      notas: notas || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Cierre de Turno</DialogTitle>
          <p className="text-sm text-muted-foreground">{branchName}</p>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-180px)] px-6">
          <div className="space-y-4 pb-4">
            {/* Date and Shift selectors */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date picker */}
              <div>
                <Label className="text-xs text-muted-foreground">Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !fecha && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fecha ? format(fecha, 'PPP', { locale: es }) : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={(d) => d && setFecha(d)}
                      locale={es}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Shift selector */}
              <div>
                <Label className="text-xs text-muted-foreground">Turno</Label>
                <Select value={turno} onValueChange={(v) => setTurno(v as ShiftType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledShifts?.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    )) || (
                      <>
                        <SelectItem value="mediodía">Mediodía</SelectItem>
                        <SelectItem value="noche">Noche</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Sections */}
            <BurgersSection
              data={hamburguesas}
              onChange={setHamburguesas}
              totalHamburguesas={totals.totalHamburguesas}
            />
            
            <LocalSalesSection
              data={ventasLocal}
              onChange={setVentasLocal}
              subtotal={totals.subtotalLocal}
            />
            
            <AppSalesSection
              branchId={branchId}
              data={ventasApps}
              onChange={setVentasApps}
              subtotal={totals.subtotalApps}
            />
            
            <InvoicingSection
              totalFacturado={totalFacturado}
              onTotalFacturadoChange={setTotalFacturado}
              facturacionEsperada={totals.facturacionEsperada}
              totalVendido={totals.totalVendido}
              efectivoLocal={totals.efectivoLocal}
              efectivoMasDelivery={totals.efectivoMasDelivery}
            />
            
            {/* Summary */}
            <ClosureSummary
              totalHamburguesas={totals.totalHamburguesas}
              totalVendido={totals.totalVendido}
              totalEfectivo={totals.totalEfectivo}
              totalDigital={totals.totalDigital}
              totalFacturado={totalFacturado}
            />
            
            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">Notas del turno (opcional)</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones, incidentes, novedades..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
