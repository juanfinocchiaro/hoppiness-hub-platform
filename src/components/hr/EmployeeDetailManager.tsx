import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCanViewPrivateData } from '@/hooks/useCanViewPrivateData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RestrictedField, RestrictedSectionHeader } from '@/components/ui/restricted-field';
import { toast } from 'sonner';
import { 
  User, 
  FileText, 
  AlertTriangle,
  Plus,
  Upload,
  Printer,
  Edit2,
  Trash2,
  Camera,
  Save,
  Loader2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileCheck,
  X,
  Eye,
  Lock,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
  photo_url: string | null;
  hire_date: string | null;
  is_active: boolean;
  current_status: string;
}

interface EmployeePrivateDetails {
  id: string;
  employee_id: string;
  hourly_rate: number | null;
  address: string | null;
  cbu: string | null;
  cuit: string | null;
  dni: string | null;
  birth_date: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
}

interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  notes: string | null;
  created_at: string;
}

interface EmployeeWarning {
  id: string;
  employee_id: string;
  warning_type: string;
  reason: string;
  description: string | null;
  incident_date: string;
  document_url: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

interface EmployeeDetailManagerProps {
  branchId: string;
  canManage: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'ficha_personal', label: 'Ficha Personal Firmada' },
  { value: 'reglamento_interno', label: 'Reglamento Interno' },
  { value: 'reglamento_firmado', label: 'Reglamento Firmado' },
  { value: 'dni_frente', label: 'DNI Frente' },
  { value: 'dni_dorso', label: 'DNI Dorso' },
  { value: 'contrato', label: 'Contrato Laboral' },
  { value: 'otros', label: 'Otros' },
];

const WARNING_TYPES = [
  { value: 'verbal', label: 'Apercibimiento Verbal' },
  { value: 'written', label: 'Apercibimiento Escrito' },
  { value: 'suspension', label: 'Suspensión' },
  { value: 'final_warning', label: 'Último Aviso' },
];

export default function EmployeeDetailManager({ branchId, canManage }: EmployeeDetailManagerProps) {
  const { user } = useAuth();
  const { canViewPrivateData, loading: loadingPermissions } = useCanViewPrivateData(branchId);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedPrivateDetails, setSelectedPrivateDetails] = useState<EmployeePrivateDetails | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [warnings, setWarnings] = useState<EmployeeWarning[]>([]);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const warningDocInputRef = useRef<HTMLInputElement>(null);
  
  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    position: '',
    phone: '',
    hourly_rate: '',
    address: '',
    cbu: '',
    cuit: '',
    dni: '',
    birth_date: '',
    hire_date: format(new Date(), 'yyyy-MM-dd'),
    emergency_contact: '',
    emergency_phone: '',
    pin_code: '',
  });

  const [documentForm, setDocumentForm] = useState({
    document_type: 'ficha_personal',
    notes: '',
    file: null as File | null,
  });

  const [warningForm, setWarningForm] = useState({
    warning_type: 'written',
    reason: '',
    description: '',
    incident_date: format(new Date(), 'yyyy-MM-dd'),
    file: null as File | null,
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch employees (basic info only - no sensitive data)
  useEffect(() => {
    if (!branchId) return;
    
    async function fetchEmployees() {
      setLoading(true);
      try {
        let query = supabase
          .from('employees')
          .select('id, full_name, position, phone, photo_url, hire_date, is_active, current_status')
          .eq('branch_id', branchId)
          .order('full_name');
        
        if (!showInactive) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;
        setEmployees(data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('Error al cargar empleados');
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, [branchId, showInactive]);

  // Fetch private details and documents when employee is selected
  useEffect(() => {
    if (!selectedEmployee) {
      setSelectedPrivateDetails(null);
      setDocuments([]);
      setWarnings([]);
      return;
    }

    async function fetchEmployeeData() {
      try {
        const [docsRes, warningsRes] = await Promise.all([
          supabase
            .from('employee_documents')
            .select('*')
            .eq('employee_id', selectedEmployee.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('employee_warnings')
            .select('*')
            .eq('employee_id', selectedEmployee.id)
            .order('incident_date', { ascending: false }),
        ]);

        setDocuments(docsRes.data || []);
        setWarnings(warningsRes.data || []);

        // Only fetch private details if user has permission
        if (canViewPrivateData) {
          const { data: privateData } = await supabase
            .from('employee_private_details')
            .select('*')
            .eq('employee_id', selectedEmployee.id)
            .maybeSingle();
          
          setSelectedPrivateDetails(privateData || null);
        }
      } catch (error) {
        console.error('Error fetching employee data:', error);
        // Handle 403/406 errors gracefully
        if ((error as any)?.code === '42501' || (error as any)?.code === 'PGRST301') {
          toast.error('No tenés permisos para ver esta información');
        }
      }
    }
      } catch (error) {
        console.error('Error fetching employee data:', error);
        // Handle 403/406 errors gracefully
        if ((error as any)?.code === '42501' || (error as any)?.code === 'PGRST301') {
          toast.error('No tenés permisos para ver esta información');
        }
      }
    }

    fetchEmployeeData();
  }, [selectedEmployee, canViewPrivateData]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    
    const fileExt = photoFile.name.split('.').pop();
    const filePath = `photos/${branchId}/${crypto.randomUUID()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('employee-documents')
      .upload(filePath, photoFile);
    
    if (error) throw error;
    
    const { data } = supabase.storage
      .from('employee-documents')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  };

  const handleAddEmployee = async () => {
    if (!employeeForm.full_name || !employeeForm.dni || !employeeForm.pin_code) {
      toast.error('Nombre, DNI y PIN son requeridos');
      return;
    }

    if (employeeForm.pin_code.length !== 4) {
      toast.error('El PIN debe ser de 4 dígitos');
      return;
    }

    setSaving(true);
    try {
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      // Insert basic employee data
      const { data: newEmployee, error: empError } = await supabase
        .from('employees')
        .insert({
          branch_id: branchId,
          full_name: employeeForm.full_name,
          position: employeeForm.position || null,
          phone: employeeForm.phone || null,
          photo_url: photoUrl,
          hire_date: employeeForm.hire_date || null,
          pin_code: employeeForm.pin_code,
          // Keep DNI in main table for PIN lookup but also in private
          dni: employeeForm.dni,
        })
        .select('id, full_name, position, phone, photo_url, hire_date, is_active, current_status')
        .single();

      if (empError) throw empError;

      // Insert private details
      const { error: privateError } = await supabase
        .from('employee_private_details')
        .insert({
          employee_id: newEmployee.id,
          dni: employeeForm.dni,
          cuit: employeeForm.cuit || null,
          cbu: employeeForm.cbu || null,
          address: employeeForm.address || null,
          birth_date: employeeForm.birth_date || null,
          emergency_contact: employeeForm.emergency_contact || null,
          emergency_phone: employeeForm.emergency_phone || null,
          hourly_rate: employeeForm.hourly_rate ? parseFloat(employeeForm.hourly_rate) : null,
        });

      if (privateError) {
        console.error('Error inserting private details:', privateError);
        // Don't fail the whole operation, private details are secondary
      }

      setEmployees(prev => [...prev, newEmployee]);
      setShowAddDialog(false);
      resetEmployeeForm();
      toast.success('Empleado agregado correctamente');
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Error al agregar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      let photoUrl = selectedEmployee.photo_url;
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      // Update basic employee data
      const { error: empError } = await supabase
        .from('employees')
        .update({
          full_name: employeeForm.full_name,
          position: employeeForm.position || null,
          phone: employeeForm.phone || null,
          photo_url: photoUrl,
          hire_date: employeeForm.hire_date || null,
        })
        .eq('id', selectedEmployee.id);

      if (empError) throw empError;

      // Update or insert private details (upsert)
      if (canViewPrivateData) {
        const privateData = {
          employee_id: selectedEmployee.id,
          dni: employeeForm.dni || null,
          cuit: employeeForm.cuit || null,
          cbu: employeeForm.cbu || null,
          address: employeeForm.address || null,
          birth_date: employeeForm.birth_date || null,
          emergency_contact: employeeForm.emergency_contact || null,
          emergency_phone: employeeForm.emergency_phone || null,
          hourly_rate: employeeForm.hourly_rate ? parseFloat(employeeForm.hourly_rate) : null,
        };

        if (selectedPrivateDetails) {
          await supabase
            .from('employee_private_details')
            .update(privateData)
            .eq('id', selectedPrivateDetails.id);
        } else {
          await supabase
            .from('employee_private_details')
            .insert(privateData);
        }
      }

      setEmployees(prev => prev.map(e => 
        e.id === selectedEmployee.id 
          ? { ...e, full_name: employeeForm.full_name, position: employeeForm.position || null, phone: employeeForm.phone || null, photo_url: photoUrl, hire_date: employeeForm.hire_date || null }
          : e
      ));
      setSelectedEmployee(prev => prev ? { ...prev, full_name: employeeForm.full_name, position: employeeForm.position || null, phone: employeeForm.phone || null, photo_url: photoUrl, hire_date: employeeForm.hire_date || null } : null);
      setShowEditDialog(false);
      toast.success('Empleado actualizado');
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Error al actualizar empleado');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedEmployee || !documentForm.file) {
      toast.error('Seleccioná un archivo');
      return;
    }

    setUploading(true);
    try {
      const fileExt = documentForm.file.name.split('.').pop();
      const filePath = `documents/${selectedEmployee.id}/${documentForm.document_type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, documentForm.file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('employee-documents')
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: selectedEmployee.id,
          document_type: documentForm.document_type,
          file_url: urlData.publicUrl,
          file_name: documentForm.file.name,
          notes: documentForm.notes || null,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [data, ...prev]);
      setShowDocumentDialog(false);
      setDocumentForm({ document_type: 'ficha_personal', notes: '', file: null });
      toast.success('Documento subido correctamente');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  const handleAddWarning = async () => {
    if (!selectedEmployee || !warningForm.reason) {
      toast.error('El motivo es requerido');
      return;
    }

    setSaving(true);
    try {
      let documentUrl = null;
      if (warningForm.file) {
        const fileExt = warningForm.file.name.split('.').pop();
        const filePath = `warnings/${selectedEmployee.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('employee-documents')
          .upload(filePath, warningForm.file);
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('employee-documents')
          .getPublicUrl(filePath);
        
        documentUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('employee_warnings')
        .insert({
          employee_id: selectedEmployee.id,
          warning_type: warningForm.warning_type,
          reason: warningForm.reason,
          description: warningForm.description || null,
          incident_date: warningForm.incident_date,
          document_url: documentUrl,
          issued_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setWarnings(prev => [data, ...prev]);
      setShowWarningDialog(false);
      setWarningForm({ warning_type: 'written', reason: '', description: '', incident_date: format(new Date(), 'yyyy-MM-dd'), file: null });
      toast.success('Apercibimiento registrado');
    } catch (error) {
      console.error('Error adding warning:', error);
      toast.error('Error al registrar apercibimiento');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintFicha = () => {
    if (!selectedEmployee || !canViewPrivateData) {
      toast.error('No tenés permisos para imprimir la ficha completa');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha de Personal - ${selectedEmployee.full_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .photo { width: 120px; height: 150px; border: 1px solid #ccc; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
          .photo img { max-width: 100%; max-height: 100%; object-fit: cover; }
          .field { margin-bottom: 15px; display: flex; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
          .label { font-weight: bold; width: 180px; flex-shrink: 0; }
          .value { flex: 1; }
          .section { margin-top: 30px; margin-bottom: 20px; font-weight: bold; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 5px; }
          .signature { margin-top: 80px; display: flex; justify-content: space-between; }
          .signature-line { text-align: center; width: 200px; }
          .signature-line div { border-top: 1px solid #333; padding-top: 5px; margin-top: 60px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FICHA DE PERSONAL</h1>
          <p>Fecha de emisión: ${format(new Date(), 'dd/MM/yyyy', { locale: es })}</p>
        </div>
        
        <div class="photo">
          ${selectedEmployee.photo_url ? `<img src="${selectedEmployee.photo_url}" alt="Foto" />` : 'SIN FOTO'}
        </div>
        
        <div class="section">Datos Personales</div>
        <div class="field"><span class="label">Nombre Completo:</span><span class="value">${selectedEmployee.full_name}</span></div>
        <div class="field"><span class="label">DNI:</span><span class="value">${selectedPrivateDetails?.dni || '-'}</span></div>
        <div class="field"><span class="label">CUIT:</span><span class="value">${selectedPrivateDetails?.cuit || '-'}</span></div>
        <div class="field"><span class="label">Fecha de Nacimiento:</span><span class="value">${selectedPrivateDetails?.birth_date ? format(new Date(selectedPrivateDetails.birth_date), 'dd/MM/yyyy') : '-'}</span></div>
        <div class="field"><span class="label">Teléfono:</span><span class="value">${selectedEmployee.phone || '-'}</span></div>
        <div class="field"><span class="label">Dirección:</span><span class="value">${selectedPrivateDetails?.address || '-'}</span></div>
        
        <div class="section">Datos Bancarios</div>
        <div class="field"><span class="label">CBU:</span><span class="value">${selectedPrivateDetails?.cbu || '-'}</span></div>
        
        <div class="section">Datos Laborales</div>
        <div class="field"><span class="label">Puesto:</span><span class="value">${selectedEmployee.position || '-'}</span></div>
        <div class="field"><span class="label">Fecha de Ingreso:</span><span class="value">${selectedEmployee.hire_date ? format(new Date(selectedEmployee.hire_date), 'dd/MM/yyyy') : '-'}</span></div>
        <div class="field"><span class="label">Valor Hora:</span><span class="value">${selectedPrivateDetails?.hourly_rate ? '$' + selectedPrivateDetails.hourly_rate : '-'}</span></div>
        
        <div class="section">Contacto de Emergencia</div>
        <div class="field"><span class="label">Nombre:</span><span class="value">${selectedPrivateDetails?.emergency_contact || '-'}</span></div>
        <div class="field"><span class="label">Teléfono:</span><span class="value">${selectedPrivateDetails?.emergency_phone || '-'}</span></div>
        
        <div class="signature">
          <div class="signature-line">
            <div>Firma del Empleado</div>
          </div>
          <div class="signature-line">
            <div>Firma del Empleador</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      full_name: '',
      position: '',
      phone: '',
      hourly_rate: '',
      address: '',
      cbu: '',
      cuit: '',
      dni: '',
      birth_date: '',
      hire_date: format(new Date(), 'yyyy-MM-dd'),
      emergency_contact: '',
      emergency_phone: '',
      pin_code: '',
    });
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      full_name: employee.full_name,
      position: employee.position || '',
      phone: employee.phone || '',
      hourly_rate: selectedPrivateDetails?.hourly_rate?.toString() || '',
      address: selectedPrivateDetails?.address || '',
      cbu: selectedPrivateDetails?.cbu || '',
      cuit: selectedPrivateDetails?.cuit || '',
      dni: selectedPrivateDetails?.dni || '',
      birth_date: selectedPrivateDetails?.birth_date || '',
      hire_date: employee.hire_date || '',
      emergency_contact: selectedPrivateDetails?.emergency_contact || '',
      emergency_phone: selectedPrivateDetails?.emergency_phone || '',
      pin_code: '',
    });
    setPhotoPreview(employee.photo_url);
    setShowEditDialog(true);
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(d => d.value === type)?.label || type;
  };

  const getWarningTypeLabel = (type: string) => {
    return WARNING_TYPES.find(w => w.value === type)?.label || type;
  };

  const getWarningBadgeVariant = (type: string) => {
    switch (type) {
      case 'verbal': return 'secondary';
      case 'written': return 'default';
      case 'suspension': return 'destructive';
      case 'final_warning': return 'destructive';
      default: return 'outline';
    }
  };

  const toggleEmployeeActive = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id);
      
      if (error) throw error;
      
      toast.success(employee.is_active ? 'Empleado deshabilitado' : 'Empleado habilitado');
      
      setEmployees(prev => prev.map(e => 
        e.id === employee.id ? { ...e, is_active: !e.is_active } : e
      ));
      
      if (selectedEmployee?.id === employee.id) {
        setSelectedEmployee({ ...selectedEmployee, is_active: !employee.is_active });
      }
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast.error('Error al cambiar estado');
    }
  };

  if (loading || loadingPermissions) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Empleados Operativos</h2>
          <p className="text-sm text-muted-foreground">Personal que ficha con PIN</p>
        </div>
        <div className="flex items-center gap-3">
          {!canViewPrivateData && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              <Lock className="h-3 w-3 mr-1" />
              Vista limitada
            </Badge>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox" 
              checked={showInactive} 
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-input"
            />
            Ver deshabilitados
          </label>
          {canManage && (
            <Button onClick={() => { resetEmployeeForm(); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employee List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lista de Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No hay empleados registrados</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {employees.map(emp => (
                    <div
                      key={emp.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${selectedEmployee?.id === emp.id ? 'border-primary bg-primary/5' : ''} ${!emp.is_active ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={emp.photo_url || ''} />
                          <AvatarFallback>{emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{emp.full_name}</p>
                            {!emp.is_active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{emp.position || 'Sin puesto'}</p>
                        </div>
                        {canManage && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditDialog(emp); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); toggleEmployeeActive(emp); }}
                              title={emp.is_active ? 'Deshabilitar' : 'Habilitar'}
                            >
                              {emp.is_active ? <X className="h-4 w-4 text-destructive" /> : <User className="h-4 w-4 text-green-600" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Employee Detail */}
        {selectedEmployee ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Detalle del Empleado</CardTitle>
                <div className="flex gap-2">
                  {canViewPrivateData && (
                    <Button variant="outline" size="sm" onClick={handlePrintFicha}>
                      <Printer className="h-4 w-4 mr-1" />
                      Imprimir Ficha
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info">
                <TabsList className="w-full">
                  <TabsTrigger value="info" className="flex-1">Datos</TabsTrigger>
                  <TabsTrigger value="private" className="flex-1">
                    <span className="flex items-center gap-1">
                      Privado
                      {!canViewPrivateData && <Lock className="h-3 w-3" />}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1">Documentos</TabsTrigger>
                  <TabsTrigger value="warnings" className="flex-1">Aperc.</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={selectedEmployee.photo_url || ''} />
                      <AvatarFallback className="text-xl">{selectedEmployee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg">{selectedEmployee.full_name}</h3>
                      <p className="text-muted-foreground">{selectedEmployee.position || 'Sin puesto asignado'}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span>{selectedEmployee.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Ingreso:</span>
                      <span>{selectedEmployee.hire_date ? format(new Date(selectedEmployee.hire_date), 'dd/MM/yyyy') : '-'}</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="private" className="mt-4 space-y-4">
                  {!canViewPrivateData ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                      <h3 className="font-semibold text-foreground mb-1">Acceso Restringido</h3>
                      <p className="text-sm">Solo administradores y encargados pueden ver datos personales sensibles</p>
                      <p className="text-xs mt-2 opacity-75">DNI, CUIT, CBU, dirección y datos de emergencia están protegidos</p>
                    </div>
                  ) : (
                    <>
                      <RestrictedSectionHeader title="Documentación Personal" isRestricted={false} />
                      <div className="grid gap-3 text-sm">
                        <RestrictedField 
                          label="DNI" 
                          value={selectedPrivateDetails?.dni} 
                          canView={canViewPrivateData}
                          icon={<CreditCard className="h-4 w-4" />}
                        />
                        <RestrictedField 
                          label="CUIT" 
                          value={selectedPrivateDetails?.cuit} 
                          canView={canViewPrivateData}
                          icon={<CreditCard className="h-4 w-4" />}
                        />
                        <RestrictedField 
                          label="Fecha Nacimiento" 
                          value={selectedPrivateDetails?.birth_date ? format(new Date(selectedPrivateDetails.birth_date), 'dd/MM/yyyy') : null} 
                          canView={canViewPrivateData}
                          icon={<Calendar className="h-4 w-4" />}
                        />
                      </div>
                      
                      <Separator />
                      
                      <RestrictedSectionHeader title="Dirección y Contacto de Emergencia" isRestricted={false} />
                      <div className="grid gap-3 text-sm">
                        <RestrictedField 
                          label="Dirección" 
                          value={selectedPrivateDetails?.address} 
                          canView={canViewPrivateData}
                          icon={<MapPin className="h-4 w-4" />}
                        />
                        <RestrictedField 
                          label="Contacto Emergencia" 
                          value={selectedPrivateDetails?.emergency_contact} 
                          canView={canViewPrivateData}
                          icon={<User className="h-4 w-4" />}
                        />
                        <RestrictedField 
                          label="Tel. Emergencia" 
                          value={selectedPrivateDetails?.emergency_phone} 
                          canView={canViewPrivateData}
                          icon={<Phone className="h-4 w-4" />}
                        />
                      </div>
                      
                      <Separator />
                      
                      <RestrictedSectionHeader title="Datos Bancarios y Salariales" isRestricted={false} />
                      <div className="grid gap-3 text-sm">
                        <RestrictedField 
                          label="CBU" 
                          value={selectedPrivateDetails?.cbu} 
                          canView={canViewPrivateData}
                          icon={<CreditCard className="h-4 w-4" />}
                          className="font-mono text-xs"
                        />
                        <RestrictedField 
                          label="Valor Hora" 
                          value={selectedPrivateDetails?.hourly_rate ? `$${selectedPrivateDetails.hourly_rate}` : null} 
                          canView={canViewPrivateData}
                          icon={<DollarSign className="h-4 w-4" />}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="documents" className="mt-4 space-y-4">
                  {canManage && (
                    <Button variant="outline" size="sm" onClick={() => setShowDocumentDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Documento
                    </Button>
                  )}
                  
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin documentos</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {documents.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-green-600" />
                              <div>
                                <p className="text-sm font-medium">{getDocumentTypeLabel(doc.document_type)}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'dd/MM/yyyy')}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>

                <TabsContent value="warnings" className="mt-4 space-y-4">
                  {canManage && (
                    <Button variant="outline" size="sm" onClick={() => setShowWarningDialog(true)}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Nuevo Apercibimiento
                    </Button>
                  )}
                  
                  {warnings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin apercibimientos</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {warnings.map(warning => (
                          <div key={warning.id} className="p-3 border rounded space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant={getWarningBadgeVariant(warning.warning_type)}>
                                {getWarningTypeLabel(warning.warning_type)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(warning.incident_date), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{warning.reason}</p>
                            {warning.description && (
                              <p className="text-xs text-muted-foreground">{warning.description}</p>
                            )}
                            {warning.document_url && (
                              <Button variant="link" size="sm" className="h-auto p-0" asChild>
                                <a href={warning.document_url} target="_blank" rel="noopener noreferrer">
                                  Ver documento firmado
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Seleccioná un empleado para ver su detalle</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Empleado</DialogTitle>
            <DialogDescription>Completá los datos del nuevo empleado</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Photo Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <AvatarImage src={photoPreview || ''} />
                <AvatarFallback>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Foto
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Foto de frente para la ficha</p>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input value={employeeForm.full_name} onChange={e => setEmployeeForm(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Puesto</Label>
                <Input placeholder="Cajero, Cocinero, etc." value={employeeForm.position} onChange={e => setEmployeeForm(p => ({ ...p, position: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={employeeForm.phone} onChange={e => setEmployeeForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Ingreso</Label>
                <Input type="date" value={employeeForm.hire_date} onChange={e => setEmployeeForm(p => ({ ...p, hire_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>DNI *</Label>
                <Input value={employeeForm.dni} onChange={e => setEmployeeForm(p => ({ ...p, dni: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>PIN de Fichada (4 dígitos) *</Label>
                <Input type="password" inputMode="numeric" maxLength={4} value={employeeForm.pin_code} onChange={e => setEmployeeForm(p => ({ ...p, pin_code: e.target.value.replace(/\D/g, '') }))} />
              </div>
            </div>

            {canViewPrivateData && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Datos Privados (solo visible para administradores)</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>CUIT</Label>
                    <Input placeholder="20-12345678-9" value={employeeForm.cuit} onChange={e => setEmployeeForm(p => ({ ...p, cuit: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>CBU</Label>
                    <Input placeholder="22 dígitos" value={employeeForm.cbu} onChange={e => setEmployeeForm(p => ({ ...p, cbu: e.target.value }))} maxLength={22} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dirección Completa</Label>
                    <Input placeholder="Calle, Número, Localidad, Provincia" value={employeeForm.address} onChange={e => setEmployeeForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento</Label>
                    <Input type="date" value={employeeForm.birth_date} onChange={e => setEmployeeForm(p => ({ ...p, birth_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Hora ($)</Label>
                    <Input type="number" value={employeeForm.hourly_rate} onChange={e => setEmployeeForm(p => ({ ...p, hourly_rate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto de Emergencia</Label>
                    <Input value={employeeForm.emergency_contact} onChange={e => setEmployeeForm(p => ({ ...p, emergency_contact: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono Emergencia</Label>
                    <Input value={employeeForm.emergency_phone} onChange={e => setEmployeeForm(p => ({ ...p, emergency_phone: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddEmployee} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <AvatarImage src={photoPreview || ''} />
                <AvatarFallback><Camera className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Cambiar Foto
              </Button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={employeeForm.full_name} onChange={e => setEmployeeForm(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Puesto</Label>
                <Input value={employeeForm.position} onChange={e => setEmployeeForm(p => ({ ...p, position: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={employeeForm.phone} onChange={e => setEmployeeForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Ingreso</Label>
                <Input type="date" value={employeeForm.hire_date} onChange={e => setEmployeeForm(p => ({ ...p, hire_date: e.target.value }))} />
              </div>
            </div>

            {canViewPrivateData && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Datos Privados</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>DNI</Label>
                    <Input value={employeeForm.dni} onChange={e => setEmployeeForm(p => ({ ...p, dni: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>CUIT</Label>
                    <Input value={employeeForm.cuit} onChange={e => setEmployeeForm(p => ({ ...p, cuit: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>CBU</Label>
                    <Input value={employeeForm.cbu} onChange={e => setEmployeeForm(p => ({ ...p, cbu: e.target.value }))} maxLength={22} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento</Label>
                    <Input type="date" value={employeeForm.birth_date} onChange={e => setEmployeeForm(p => ({ ...p, birth_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Dirección Completa</Label>
                    <Input value={employeeForm.address} onChange={e => setEmployeeForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Hora ($)</Label>
                    <Input type="number" value={employeeForm.hourly_rate} onChange={e => setEmployeeForm(p => ({ ...p, hourly_rate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contacto de Emergencia</Label>
                    <Input value={employeeForm.emergency_contact} onChange={e => setEmployeeForm(p => ({ ...p, emergency_contact: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono Emergencia</Label>
                    <Input value={employeeForm.emergency_phone} onChange={e => setEmployeeForm(p => ({ ...p, emergency_phone: e.target.value }))} />
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleUpdateEmployee} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>Subir un documento para {selectedEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={documentForm.document_type} onValueChange={v => setDocumentForm(p => ({ ...p, document_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setDocumentForm(p => ({ ...p, file: e.target.files?.[0] || null }))} />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={documentForm.notes} onChange={e => setDocumentForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>Cancelar</Button>
            <Button onClick={handleUploadDocument} disabled={uploading || !documentForm.file}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Apercibimiento</DialogTitle>
            <DialogDescription>Registrar un apercibimiento para {selectedEmployee?.full_name}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={warningForm.warning_type} onValueChange={v => setWarningForm(p => ({ ...p, warning_type: v }))}>
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
              <Label>Fecha del Incidente</Label>
              <Input type="date" value={warningForm.incident_date} onChange={e => setWarningForm(p => ({ ...p, incident_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Input value={warningForm.reason} onChange={e => setWarningForm(p => ({ ...p, reason: e.target.value }))} placeholder="Ej: Llegada tarde sin aviso" />
            </div>
            <div className="space-y-2">
              <Label>Descripción Detallada</Label>
              <Textarea value={warningForm.description} onChange={e => setWarningForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Documento Firmado (opcional)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setWarningForm(p => ({ ...p, file: e.target.files?.[0] || null }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWarningDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddWarning} disabled={saving || !warningForm.reason}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
