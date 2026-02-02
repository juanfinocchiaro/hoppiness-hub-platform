/**
 * EditScheduleDayModal - Modal for editing a single schedule entry
 * 
 * Allows modifying an existing published schedule:
 * - Change start/end time
 * - Mark as day off
 * - Requires modification reason for audit
 * - Optional notifications
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Calendar, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { useModifySchedule, type ScheduleEntry } from '@/hooks/useSchedules';

interface EditScheduleDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: ScheduleEntry;
  employeeName: string;
  onSuccess: () => void;
}

// Common shift presets
const SHIFT_PRESETS = [
  { label: 'Mañana (09:00 - 17:00)', start: '09:00', end: '17:00' },
  { label: 'Tarde (14:00 - 22:00)', start: '14:00', end: '22:00' },
  { label: 'Noche (18:00 - 02:00)', start: '18:00', end: '02:00' },
  { label: 'Mediodía (11:00 - 15:00)', start: '11:00', end: '15:00' },
  { label: 'Personalizado', start: null, end: null, isCustom: true },
];

export default function EditScheduleDayModal({
  open,
  onOpenChange,
  schedule,
  employeeName,
  onSuccess,
}: EditScheduleDayModalProps) {
  const modifySchedule = useModifySchedule();
  
  // State
  const [selectedPreset, setSelectedPreset] = useState<string>('Personalizado');
  const [startTime, setStartTime] = useState(schedule.start_time?.slice(0, 5) || '19:30');
  const [endTime, setEndTime] = useState(schedule.end_time?.slice(0, 5) || '23:30');
  const [isDayOff, setIsDayOff] = useState(schedule.is_day_off);
  const [reason, setReason] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyCommunication, setNotifyCommunication] = useState(true);
  
  // Format date for display
  const formattedDate = schedule.schedule_date 
    ? format(parseISO(schedule.schedule_date), "EEEE d 'de' MMMM", { locale: es })
    : '';
  
  // Current schedule display
  const currentScheduleText = schedule.is_day_off 
    ? 'Franco'
    : `${schedule.start_time?.slice(0, 5)} - ${schedule.end_time?.slice(0, 5)}`;
  
  // Handle preset selection
  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    
    if (value === 'Franco') {
      setIsDayOff(true);
      return;
    }
    
    setIsDayOff(false);
    const preset = SHIFT_PRESETS.find(p => p.label === value);
    if (preset && preset.start && preset.end) {
      setStartTime(preset.start);
      setEndTime(preset.end);
    }
  };
  
  // Handle save
  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error('El motivo del cambio es obligatorio');
      return;
    }
    
    try {
      await modifySchedule.mutateAsync({
        schedule_id: schedule.id,
        start_time: isDayOff ? '00:00:00' : `${startTime}:00`,
        end_time: isDayOff ? '00:00:00' : `${endTime}:00`,
        is_day_off: isDayOff,
        modification_reason: reason.trim(),
        notify_email: notifyEmail,
        notify_communication: notifyCommunication,
      });
      
      toast.success('Horario modificado correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al modificar');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Editar Horario
          </DialogTitle>
          <DialogDescription>
            {employeeName} — <span className="capitalize">{formattedDate}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Current schedule */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Horario actual</p>
            <p className="font-medium">{currentScheduleText}</p>
          </div>
          
          {/* Preset selector */}
          <div className="space-y-2">
            <Label>Nuevo turno</Label>
            <Select value={selectedPreset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar turno" />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value="Franco">Franco</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Custom time inputs */}
          {!isDayOff && selectedPreset === 'Personalizado' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Salida</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}
          
          {/* Day off checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isDayOff"
              checked={isDayOff}
              onCheckedChange={(checked) => {
                setIsDayOff(!!checked);
                if (checked) setSelectedPreset('Franco');
              }}
            />
            <Label htmlFor="isDayOff" className="cursor-pointer">
              Marcar como Franco
            </Label>
          </div>
          
          {/* Modification reason */}
          <div className="space-y-2">
            <Label>
              Motivo del cambio <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Ej: Cambio de turno por pedido del empleado"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Notification options */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Notificaciones</p>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="notifyEmail"
                checked={notifyEmail}
                onCheckedChange={(checked) => setNotifyEmail(!!checked)}
              />
              <Label htmlFor="notifyEmail" className="flex items-center gap-2 cursor-pointer">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Enviar email
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="notifyCommunication"
                checked={notifyCommunication}
                onCheckedChange={(checked) => setNotifyCommunication(!!checked)}
              />
              <Label htmlFor="notifyCommunication" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Enviar comunicado interno
              </Label>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={modifySchedule.isPending || !reason.trim()}
          >
            {modifySchedule.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
