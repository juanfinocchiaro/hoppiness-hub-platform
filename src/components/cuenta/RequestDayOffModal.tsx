import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsV2 } from '@/hooks/usePermissionsV2';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2, Send, CalendarOff, RefreshCw, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface RequestDayOffModalProps {
  branchId?: string;
  trigger?: React.ReactNode;
}

export default function RequestDayOffModal({ branchId, trigger }: RequestDayOffModalProps) {
  const { user } = useAuth();
  const { branchRoles } = usePermissionsV2();
  const queryClient = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<'day_off' | 'shift_change' | 'other'>('day_off');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');

  // Use first branch if not specified
  const targetBranchId = branchId || branchRoles?.[0]?.branch_id;

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!user || !targetBranchId || !selectedDate) {
        throw new Error('Faltan datos requeridos');
      }

      const { error } = await supabase
        .from('schedule_requests')
        .insert({
          user_id: user.id,
          branch_id: targetBranchId,
          request_type: requestType,
          request_date: format(selectedDate, 'yyyy-MM-dd'),
          reason: reason || null,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitud enviada correctamente');
      queryClient.invalidateQueries({ queryKey: ['my-schedule-requests'] });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating request:', error);
      toast.error('Error al enviar la solicitud');
    },
  });

  const resetForm = () => {
    setRequestType('day_off');
    setSelectedDate(undefined);
    setReason('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast.error('Seleccioná una fecha');
      return;
    }

    if (selectedDate < new Date()) {
      toast.error('La fecha debe ser futura');
      return;
    }

    createRequest.mutate();
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'day_off': return CalendarOff;
      case 'shift_change': return RefreshCw;
      default: return HelpCircle;
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'day_off': return 'Día libre';
      case 'shift_change': return 'Cambio de turno';
      case 'other': return 'Otro';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CalendarOff className="w-4 h-4 mr-2" />
            Solicitar día libre
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar día libre / cambio</DialogTitle>
          <DialogDescription>
            Tu solicitud será revisada por el encargado del local
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Request Type */}
          <div className="space-y-3">
            <Label>Tipo de solicitud</Label>
            <RadioGroup
              value={requestType}
              onValueChange={(v) => setRequestType(v as any)}
              className="grid grid-cols-3 gap-2"
            >
              {(['day_off', 'shift_change', 'other'] as const).map((type) => {
                const Icon = getRequestTypeIcon(type);
                return (
                  <div key={type}>
                    <RadioGroupItem
                      value={type}
                      id={type}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all",
                        "hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      )}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-xs text-center font-medium">
                        {getRequestTypeLabel(type)}
                      </span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
                  ) : (
                    "Seleccionar fecha..."
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < addDays(new Date(), 1)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Turno médico, compromiso familiar, etc."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createRequest.isPending || !selectedDate}
            >
              {createRequest.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar solicitud
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
