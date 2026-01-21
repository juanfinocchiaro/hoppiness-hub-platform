import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WarningModalProps {
  userId: string;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const WARNING_TYPES = [
  { value: 'late_arrival', label: 'Llegada tarde' },
  { value: 'absence', label: 'Falta sin aviso' },
  { value: 'misconduct', label: 'Mala conducta' },
  { value: 'uniform', label: 'Uniforme incompleto' },
  { value: 'other', label: 'Otro' },
];

export function WarningModal({ userId, branchId, open, onOpenChange, onSuccess }: WarningModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<string>('late_arrival');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('warnings')
        .insert({
          user_id: userId,
          branch_id: branchId,
          warning_type: type,
          description,
          warning_date: format(date, 'yyyy-MM-dd'),
          issued_by: user?.id,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Apercibimiento registrado');
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error('Error al crear apercibimiento'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo apercibimiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WARNING_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea 
              placeholder="Detalle del apercibimiento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!description.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
