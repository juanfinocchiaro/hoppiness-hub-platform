import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Printer, Eye, ArrowLeft, Save, Camera, Upload, Clock, CheckCircle } from 'lucide-react';
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

type ModalStep = 'form' | 'preview' | 'upload-prompt' | 'uploading';

export function WarningModal({ userId, branchId, open, onOpenChange, onSuccess }: WarningModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = useState<string>('verbal');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>('form');
  const [savedWarningId, setSavedWarningId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch employee data
  const { data: employeeProfile } = useQuery({
    queryKey: ['profile-for-warning', userId],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
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
        .maybeSingle();
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
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: open && !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('warnings')
        .insert({
          user_id: userId,
          branch_id: branchId,
          warning_type: type,
          description,
          warning_date: format(date, 'yyyy-MM-dd'),
          issued_by: user?.id,
          is_active: true,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Trigger email notification (fire and forget)
      supabase.functions.invoke('send-warning-notification', {
        body: {
          warning_id: data.id,
          employee_id: userId,
          branch_id: branchId,
          warning_type: type,
          description,
          issued_by_name: issuerProfile?.full_name,
        },
      }).catch((err) => {
        if (import.meta.env.DEV) console.error('Failed to send warning notification:', err);
      });
      
      return data.id;
    },
    onSuccess: (warningId) => {
      toast.success('Apercibimiento registrado');
      setSavedWarningId(warningId);
      setStep('upload-prompt');
      onSuccess();
    },
    onError: () => toast.error('Error al crear apercibimiento'),
  });

  const handleUploadSignature = async () => {
    if (!savedWarningId || !selectedFile || !user) return;
    
    setUploading(true);
    try {
      // Upload file
      const filePath = `${userId}/${savedWarningId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('warning-signatures')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Update warning with signed document URL
      const { error: updateError } = await supabase
        .from('warnings')
        .update({ signed_document_url: filePath, acknowledged_at: new Date().toISOString() })
        .eq('id', savedWarningId);

      if (updateError) throw updateError;

      toast.success('Documento firmado subido correctamente');
      queryClient.invalidateQueries({ queryKey: ['employee-warnings', userId, branchId] });
      handleClose();
    } catch (error: any) {
      toast.error('Error al subir el documento: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setStep('form');
    setSavedWarningId(null);
    setSelectedFile(null);
    setType('verbal');
    setDescription('');
    setDate(new Date());
    onOpenChange(false);
  };

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
            @page {
              size: A4;
              margin: 15mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.5;
              color: #000;
              background: #fff;
            }
            
            img {
              max-height: 64px;
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
    }, 500);
  };

  const warningTypeLabel = WARNING_TYPES.find(t => t.value === type)?.label || type;
  const roleLabel = LOCAL_ROLE_LABELS[employeeProfile?.role || ''] || 'Empleado';

  // Upload Prompt View - after saving, ask if they want to upload the signed document now
  if (step === 'upload-prompt') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Apercibimiento guardado
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              El apercibimiento fue registrado correctamente. ¿Querés subir ahora la foto del documento firmado?
            </p>

            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Próximos pasos:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Imprimí el documento (ya lo hiciste antes)</li>
                <li>Hacé firmar al empleado</li>
                <li>Sacá una foto del documento firmado</li>
                <li>Subí la foto aquí</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              Subir después
            </Button>
            <Button onClick={() => setStep('uploading')}>
              <Camera className="h-4 w-4 mr-2" />
              Subir firma ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Uploading View
  if (step === 'uploading') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Subir documento firmado</DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Subí una foto del apercibimiento firmado por {employeeProfile?.fullName}.
            </p>

            <div className="space-y-2">
              <Label htmlFor="warning-signature">Foto del documento firmado</Label>
              <Input
                id="warning-signature"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {selectedFile && (
              <div className="p-2 bg-muted rounded text-sm flex items-center gap-2">
                📎 {selectedFile.name}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStep('upload-prompt')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button 
              onClick={handleUploadSignature} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Form View
  if (step === 'form') {
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
                {employeeProfile?.fullName || <span className="inline-block h-4 w-32 rounded bg-muted animate-pulse align-middle" />}
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
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                    onSelect={(d) => {
                      if (d) setDate(d);
                      setCalendarOpen(false);
                    }}
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
              onClick={() => setStep('preview')}
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
            <Button variant="ghost" size="sm" onClick={() => setStep('form')}>
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
          <Button variant="outline" onClick={() => setStep('form')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a editar
          </Button>
          <Button variant="secondary" onClick={handlePrint} title="Podés elegir 'Guardar como PDF' en el diálogo de impresión">
            <Printer className="h-4 w-4 mr-2" />
            Descargar / Imprimir
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
