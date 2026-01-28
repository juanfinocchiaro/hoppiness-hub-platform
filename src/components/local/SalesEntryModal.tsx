import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBranchShiftConfig, getEnabledShifts, type ShiftDefinition } from '@/hooks/useShiftConfig';

interface SalesEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  defaultShift?: string;
  defaultDate?: Date;
}

const CHANNELS = [
  { key: 'sales_counter', label: 'Mostrador' },
  { key: 'sales_rappi', label: 'Rappi' },
  { key: 'sales_pedidosya', label: 'PedidosYa' },
  { key: 'sales_mp_delivery', label: 'MP Delivery' },
  { key: 'sales_other', label: 'Otros' },
];

export function SalesEntryModal({
  open,
  onOpenChange,
  branchId,
  defaultShift = 'night',
  defaultDate = new Date(),
}: SalesEntryModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Get enabled shifts for this branch
  const { data: shiftConfig } = useBranchShiftConfig(branchId);
  const enabledShifts = getEnabledShifts(shiftConfig);
  
  const [date, setDate] = useState<Date>(defaultDate);
  const [shift, setShift] = useState(defaultShift);
  const [amounts, setAmounts] = useState<Record<string, number>>({
    sales_counter: 0,
    sales_rappi: 0,
    sales_pedidosya: 0,
    sales_mp_delivery: 0,
    sales_other: 0,
  });
  const [notes, setNotes] = useState('');

  // Update shift if the default is not in enabled list
  useEffect(() => {
    if (enabledShifts.length > 0 && !enabledShifts.find(s => s.value === shift)) {
      setShift(enabledShifts[0].value);
    }
  }, [enabledShifts, shift]);

  const total = Object.values(amounts).reduce((sum, val) => sum + (val || 0), 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No autenticado');
      
      const { error } = await supabase
        .from('daily_sales')
        .upsert({
          branch_id: branchId,
          sale_date: format(date, 'yyyy-MM-dd'),
          shift,
          sales_counter: amounts.sales_counter || 0,
          sales_rappi: amounts.sales_rappi || 0,
          sales_pedidosya: amounts.sales_pedidosya || 0,
          sales_mp_delivery: amounts.sales_mp_delivery || 0,
          sales_other: amounts.sales_other || 0,
          notes: notes || null,
          created_by: user.id,
          updated_by: user.id,
        }, {
          onConflict: 'branch_id,sale_date,shift',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ventas cargadas correctamente');
      queryClient.invalidateQueries({ queryKey: ['daily-sales', branchId] });
      queryClient.invalidateQueries({ queryKey: ['daily-sales-today', branchId] });
      queryClient.invalidateQueries({ queryKey: ['daily-sales-summary'] });
      onOpenChange(false);
      // Reset form
      setAmounts({
        sales_counter: 0,
        sales_rappi: 0,
        sales_pedidosya: 0,
        sales_mp_delivery: 0,
        sales_other: 0,
      });
      setNotes('');
    },
    onError: (error: Error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });

  const handleAmountChange = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAmounts(prev => ({ ...prev, [key]: numValue }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cargar Ventas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Fecha y Turno */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={(d) => d > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enabledShifts.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Montos por canal */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Facturación por Canal</Label>
            <div className="space-y-2">
              {CHANNELS.map(channel => (
                <div key={channel.key} className="flex items-center gap-3">
                  <Label className="w-28 text-sm text-muted-foreground">
                    {channel.label}
                  </Label>
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amounts[channel.key] || ''}
                      onChange={(e) => handleAmountChange(channel.key, e.target.value)}
                      className="pl-7"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-bold">TOTAL</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Notas del turno (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Hubo un corte de luz de 19 a 20hs..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || total === 0}
          >
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar Carga
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
