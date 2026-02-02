/**
 * CreateScheduleWizard - 3-step wizard for creating monthly schedules
 * 
 * Step 1: Select employee (shows pending requests count)
 * Step 2: Review requests & holidays
 * Step 3: Monthly schedule grid
 */
import { useState, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, ChevronRight, User, Calendar, AlertCircle, 
  Check, X, Clock, Copy, Wand2, Save, Mail, MessageSquare,
  CalendarCheck, CalendarX
} from 'lucide-react';
import { useTeamData } from '@/components/local/team/useTeamData';
import { useHolidays } from '@/hooks/useHolidays';
import { 
  useEmployeeScheduleRequests, 
  useSaveMonthlySchedule, 
  useApproveScheduleRequest,
  useRejectScheduleRequest,
  type DaySchedule 
} from '@/hooks/useSchedules';
import { LOCAL_ROLE_LABELS } from '@/hooks/usePermissionsV2';

interface CreateScheduleWizardProps {
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMonth?: number;
  initialYear?: number;
  onSuccess?: () => void;
}

type Step = 1 | 2 | 3;

interface SelectedEmployee {
  id: string;
  name: string;
  role: string;
}

// Common shift presets
const SHIFT_PRESETS = [
  { label: 'Mañana (09:00 - 17:00)', start: '09:00', end: '17:00' },
  { label: 'Tarde (14:00 - 22:00)', start: '14:00', end: '22:00' },
  { label: 'Noche (18:00 - 02:00)', start: '18:00', end: '02:00' },
  { label: 'Mediodía (11:00 - 15:00)', start: '11:00', end: '15:00' },
  { label: 'Personalizado', start: null, end: null, isCustom: true },
  { label: 'Franco', start: null, end: null, isDayOff: true },
];

export default function CreateScheduleWizard({
  branchId,
  open,
  onOpenChange,
  initialMonth,
  initialYear,
  onSuccess,
}: CreateScheduleWizardProps) {
  const now = new Date();
  const [step, setStep] = useState<Step>(1);
  const [month, setMonth] = useState(initialMonth || now.getMonth() + 1);
  const [year, setYear] = useState(initialYear || now.getFullYear());
  
  // Step 1: Employee selection
  const [selectedEmployee, setSelectedEmployee] = useState<SelectedEmployee | null>(null);
  
  // Step 3: Schedule data
  const [scheduleData, setScheduleData] = useState<Record<string, DaySchedule>>({});
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyCommunication, setNotifyCommunication] = useState(true);
  
  // For bulk apply
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [bulkPreset, setBulkPreset] = useState<string>('');
  const [customStartTime, setCustomStartTime] = useState('19:30');
  const [customEndTime, setCustomEndTime] = useState('23:30');
  
  // Fetch data
  const { team, loading: loadingTeam } = useTeamData(branchId);
  const { data: holidays = [] } = useHolidays(month, year);
  const { data: requests = [] } = useEmployeeScheduleRequests(selectedEmployee?.id, month, year);
  
  const saveSchedule = useSaveMonthlySchedule();
  const approveRequest = useApproveScheduleRequest();
  const rejectRequest = useRejectScheduleRequest();
  
  // Get pending requests count per employee
  const pendingRequestsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    // We'd need to fetch all pending requests - for now just show indicator
    return counts;
  }, []);
  
  // Generate days of the month
  const monthDays = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [month, year]);
  
  // Holiday dates set for quick lookup
  const holidayDates = useMemo(() => {
    const set = new Set<string>();
    holidays.forEach(h => set.add(h.day_date));
    return set;
  }, [holidays]);
  
  // Approved request dates
  const approvedRequestDates = useMemo(() => {
    const map = new Map<string, string>();
    requests.filter(r => r.status === 'approved').forEach(r => {
      map.set(r.request_date, r.reason || 'Día solicitado');
    });
    return map;
  }, [requests]);
  
  // Pending requests for step 2
  const pendingRequests = useMemo(() => {
    return requests.filter(r => r.status === 'pending');
  }, [requests]);
  
  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(1);
      setSelectedEmployee(null);
      setScheduleData({});
      setSelectedDays(new Set());
    }
    onOpenChange(open);
  };
  
  // Month navigation
  const goToPrevMonth = () => {
    const prev = subMonths(new Date(year, month - 1), 1);
    setMonth(prev.getMonth() + 1);
    setYear(prev.getFullYear());
  };
  
  const goToNextMonth = () => {
    const next = addMonths(new Date(year, month - 1), 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };
  
  // Handle day click in step 3
  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Don't allow editing holidays
    if (holidayDates.has(dateStr)) return;
    
    // Toggle selection for bulk actions
    const newSelected = new Set(selectedDays);
    if (newSelected.has(dateStr)) {
      newSelected.delete(dateStr);
    } else {
      newSelected.add(dateStr);
    }
    setSelectedDays(newSelected);
  };
  
  // Update schedule for a specific day
  const updateDaySchedule = (dateStr: string, updates: Partial<DaySchedule>) => {
    setScheduleData(prev => ({
      ...prev,
      [dateStr]: {
        ...(prev[dateStr] || { date: dateStr, start_time: null, end_time: null, is_day_off: false }),
        ...updates,
      },
    }));
  };
  
  // Apply preset to selected days
  const applyPresetToSelected = () => {
    const preset = SHIFT_PRESETS.find(p => p.label === bulkPreset);
    if (!preset || selectedDays.size === 0) return;
    
    const newData = { ...scheduleData };
    selectedDays.forEach(dateStr => {
      if (!holidayDates.has(dateStr)) {
        // If custom preset, use custom times
        if ((preset as any).isCustom) {
          newData[dateStr] = {
            date: dateStr,
            start_time: customStartTime,
            end_time: customEndTime,
            is_day_off: false,
          };
        } else {
          newData[dateStr] = {
            date: dateStr,
            start_time: preset.start,
            end_time: preset.end,
            is_day_off: preset.isDayOff || false,
          };
        }
      }
    });
    setScheduleData(newData);
    setSelectedDays(new Set());
    setBulkPreset('');
    toast.success(`Turno aplicado a ${selectedDays.size} días`);
  };
  
  // Copy previous week
  const copyPreviousWeek = () => {
    // Find the first date in selected days and copy from week before
    if (selectedDays.size === 0) {
      toast.error('Seleccioná al menos un día');
      return;
    }
    
    const sortedDays = Array.from(selectedDays).sort();
    const firstDate = parseISO(sortedDays[0]);
    
    // Copy schedule from 7 days ago for each selected day
    const newData = { ...scheduleData };
    selectedDays.forEach(dateStr => {
      const date = parseISO(dateStr);
      const prevWeekDate = format(new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      if (scheduleData[prevWeekDate]) {
        newData[dateStr] = {
          ...scheduleData[prevWeekDate],
          date: dateStr,
        };
      }
    });
    setScheduleData(newData);
    setSelectedDays(new Set());
    toast.success('Horarios copiados de la semana anterior');
  };
  
  // Handle save
  const handleSave = async () => {
    if (!selectedEmployee) return;
    
    // Build days array
    const days: DaySchedule[] = Object.values(scheduleData).filter(d => 
      d.is_day_off || (d.start_time && d.end_time)
    );
    
    // Also add holidays as day off
    holidays.forEach(h => {
      if (!scheduleData[h.day_date]) {
        days.push({
          date: h.day_date,
          start_time: null,
          end_time: null,
          is_day_off: true,
          is_holiday: true,
          holiday_description: h.description,
        });
      }
    });
    
    // Add approved requests as day off
    approvedRequestDates.forEach((reason, dateStr) => {
      if (!scheduleData[dateStr]) {
        days.push({
          date: dateStr,
          start_time: null,
          end_time: null,
          is_day_off: true,
          is_approved_request: true,
          request_reason: reason,
        });
      }
    });
    
    try {
      await saveSchedule.mutateAsync({
        user_id: selectedEmployee.id,
        branch_id: branchId,
        month,
        year,
        days,
        notify_email: notifyEmail,
        notify_communication: notifyCommunication,
      });
      
      toast.success('Horario publicado correctamente');
      onSuccess?.();
      handleOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    }
  };
  
  // Handle request approval
  const handleApproveRequest = async (requestId: string) => {
    try {
      await approveRequest.mutateAsync({ requestId });
      toast.success('Solicitud aprobada');
    } catch (e: any) {
      toast.error(e.message || 'Error al aprobar');
    }
  };
  
  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectRequest.mutateAsync({ requestId });
      toast.success('Solicitud rechazada');
    } catch (e: any) {
      toast.error(e.message || 'Error al rechazar');
    }
  };
  
  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
            s === step
              ? 'bg-primary text-primary-foreground'
              : s < step
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {s < step ? <Check className="w-4 h-4" /> : s}
        </div>
      ))}
    </div>
  );
  
  // Step 1: Employee Selection
  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-medium capitalize">
          {format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
        </span>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      <Separator />
      
      {/* Employee list */}
      <ScrollArea className="h-[400px]">
        {loadingTeam ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : team.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay empleados en este local
          </div>
        ) : (
          <div className="space-y-2">
            {team.map((member) => (
              <Card
                key={member.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary',
                  selectedEmployee?.id === member.id && 'border-primary bg-primary/5'
                )}
                onClick={() => setSelectedEmployee({
                  id: member.id,
                  name: member.full_name,
                  role: member.local_role || 'empleado',
                })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {LOCAL_ROLE_LABELS[member.local_role || ''] || member.local_role}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Would show pending requests count here */}
                      {selectedEmployee?.id === member.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
  
  // Step 2: Review Requests & Holidays
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <p className="font-medium">{selectedEmployee?.name}</p>
        <p className="text-sm text-muted-foreground capitalize">
          {format(new Date(year, month - 1), 'MMMM yyyy', { locale: es })}
        </p>
      </div>
      
      {/* Pending requests */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Solicitudes pendientes
        </h4>
        
        {pendingRequests.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="py-4 text-center text-muted-foreground">
              <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Sin solicitudes pendientes
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarX className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {format(parseISO(request.request_date), 'd \'de\' MMMM', { locale: es })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.reason || 'Día libre'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={rejectRequest.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={approveRequest.isPending}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Holidays */}
      <div>
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Feriados del mes
        </h4>
        
        {holidays.length === 0 ? (
          <Card className="bg-muted/50">
            <CardContent className="py-4 text-center text-muted-foreground">
              Sin feriados este mes
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {holidays.map((holiday) => (
              <Badge key={holiday.id} variant="secondary">
                {format(parseISO(holiday.day_date), 'd MMM', { locale: es })} - {holiday.description}
              </Badge>
            ))}
          </div>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          Los feriados se marcarán automáticamente como no laborables.
        </p>
      </div>
    </div>
  );
  
  // Step 3: Schedule Grid
  const renderStep3 = () => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const firstDayOfMonth = getDay(monthDays[0]);
    
    // Pad start with empty cells
    const paddedDays = [
      ...Array(firstDayOfMonth).fill(null),
      ...monthDays,
    ];
    
    // Split into weeks
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      weeks.push(paddedDays.slice(i, i + 7));
    }
    
    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Turno</Label>
            <Select value={bulkPreset} onValueChange={setBulkPreset}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar turno" />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Custom time inputs - show when "Personalizado" is selected */}
          {bulkPreset === 'Personalizado' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Entrada</Label>
                <Input 
                  type="time" 
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="w-[110px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Salida</Label>
                <Input 
                  type="time" 
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="w-[110px]"
                />
              </div>
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={applyPresetToSelected}
            disabled={!bulkPreset || selectedDays.size === 0}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Aplicar ({selectedDays.size})
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={copyPreviousWeek}
            disabled={selectedDays.size === 0}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar semana anterior
          </Button>
        </div>
        
        {/* Calendar grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-7 bg-muted">
            {dayNames.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* Days */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-t">
              {week.map((day, dayIdx) => {
                if (!day) {
                  return <div key={dayIdx} className="p-2 bg-muted/30" />;
                }
                
                const dateStr = format(day, 'yyyy-MM-dd');
                const isHoliday = holidayDates.has(dateStr);
                const isApprovedRequest = approvedRequestDates.has(dateStr);
                const isSelected = selectedDays.has(dateStr);
                const schedule = scheduleData[dateStr];
                const isSunday = day.getDay() === 0;
                
                return (
                  <div
                    key={dayIdx}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'p-2 min-h-[80px] cursor-pointer transition-colors border-r last:border-r-0',
                      isHoliday && 'bg-orange-50 dark:bg-orange-950/30',
                      isApprovedRequest && 'bg-blue-50 dark:bg-blue-950/30',
                      isSelected && 'bg-primary/10 ring-2 ring-primary ring-inset',
                      isSunday && 'bg-muted/50',
                      !isHoliday && !isSelected && 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn(
                        'text-sm font-medium',
                        isHoliday && 'text-orange-600',
                        isSunday && 'text-muted-foreground'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {isHoliday && (
                        <Badge variant="outline" className="text-[10px] px-1">🎉</Badge>
                      )}
                      {isApprovedRequest && (
                        <Badge variant="outline" className="text-[10px] px-1 bg-blue-100">✓</Badge>
                      )}
                    </div>
                    
                    {/* Schedule display */}
                    {!isHoliday && schedule && (
                      <div className="mt-1">
                        {schedule.is_day_off ? (
                          <span className="text-xs text-muted-foreground">Franco</span>
                        ) : schedule.start_time && schedule.end_time ? (
                          <span className="text-xs font-medium">
                            {schedule.start_time.slice(0, 5)}-{schedule.end_time.slice(0, 5)}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Notification options */}
        <div className="space-y-3 pt-4 border-t">
          <Label className="text-base">Notificaciones</Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-email"
                checked={notifyEmail}
                onCheckedChange={(c) => setNotifyEmail(!!c)}
              />
              <label htmlFor="notify-email" className="text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Notificar por email
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify-comm"
                checked={notifyCommunication}
                onCheckedChange={(c) => setNotifyCommunication(!!c)}
              />
              <label htmlFor="notify-comm" className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Enviar comunicado interno
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Crear Horario - Paso {step} de 3
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Seleccioná un empleado para crear su horario mensual'}
            {step === 2 && 'Revisá las solicitudes pendientes y los feriados del mes'}
            {step === 3 && 'Cargá el horario día por día'}
          </DialogDescription>
        </DialogHeader>
        
        {renderStepIndicator()}
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        
        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep((step - 1) as Step)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Atrás
            </Button>
          ) : (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              onClick={() => setStep((step + 1) as Step)}
              disabled={step === 1 && !selectedEmployee}
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saveSchedule.isPending || Object.keys(scheduleData).length === 0}
            >
              {saveSchedule.isPending ? (
                'Guardando...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar y Publicar
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
