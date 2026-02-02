import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Printer, Eye, ArrowLeft, Save } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WarningDocumentPreview } from './WarningDocumentPreview';
import { LOCAL_ROLE_LABELS } from './types';

interface WarningModalProps {
  userId: string;
  branchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const WARNING_TYPES = [
  { value: 'verbal', label: 'Llamado de atención verbal' },
  { value: 'written', label: 'Apercibimiento escrito' },
  { value: 'lateness', label: 'Llegada tarde' },
  { value: 'absence', label: 'Inasistencia' },
  { value: 'suspension', label: 'Suspensión' },
  { value: 'other', label: 'Otro' },
];

export function WarningModal({ userId, branchId, open, onOpenChange, onSuccess }: WarningModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<string>('verbal');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch employee data
  const { data: employeeProfile } = useQuery({
    queryKey: ['profile-for-warning', userId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: empData } = await supabase
        .from('employee_data')
        .select('dni')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .maybeSingle();

      const { data: role } = await supabase
        .from('user_branch_roles')
        .select('local_role')
        .eq('user_id', userId)
        .eq('branch_id', branchId)
        .maybeSingle();

      return {
        fullName: profile?.full_name || 'Sin nombre',
        dni: empData?.dni || undefined,
        role: role?.local_role || 'empleado',
      };
    },
    enabled: open,
  });

  // Fetch branch name
  const { data: branch } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('name')
        .eq('id', branchId)
        .single();
      return data;
    },
    enabled: open,
  });

  // Fetch issuer name
  const { data: issuerProfile } = useQuery({
    queryKey: ['issuer-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: open && !!user?.id,
  });

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

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Apercibimiento - ${employeeProfile?.fullName}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const warningTypeLabel = WARNING_TYPES.find(t => t.value === type)?.label || type;
  const roleLabel = LOCAL_ROLE_LABELS[employeeProfile?.role || ''] || 'Empleado';

  // Form View
  if (!showPreview) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo apercibimiento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Empleado</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {employeeProfile?.fullName || 'Cargando...'}
              </div>
            </div>

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
              <Label>Fecha del incidente</Label>
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
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              variant="secondary"
              onClick={() => setShowPreview(true)}
              disabled={!description.trim()}
            >
              <Eye className="h-4 w-4 mr-2" />
              Vista previa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Preview View
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            Vista previa del apercibimiento
          </DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden shadow-sm">
          <WarningDocumentPreview
            ref={printRef}
            data={{
              employeeName: employeeProfile?.fullName || 'Sin nombre',
              employeeDni: employeeProfile?.dni,
              employeeRole: roleLabel,
              branchName: branch?.name || 'Sucursal',
              warningType: type,
              warningTypeLabel,
              incidentDate: format(date, 'yyyy-MM-dd'),
              description,
              issuedByName: issuerProfile?.full_name || 'Encargado',
            }}
          />
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a editar
          </Button>
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Guardando...' : 'Guardar apercibimiento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
