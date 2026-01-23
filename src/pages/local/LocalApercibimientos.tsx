/**
 * LocalApercibimientos - Gestión de advertencias/apercibimientos de empleados
 */
import { useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  AlertTriangle, 
  MessageSquare, 
  FileText, 
  Clock,
  UserX,
  CheckCircle,
  Search
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface Warning {
  id: string;
  user_id: string;
  branch_id: string;
  warning_type: string;
  description: string;
  warning_date: string;
  issued_by: string;
  acknowledged_at: string | null;
  is_active: boolean;
  created_at: string;
  employee?: { full_name: string };
  issuer?: { full_name: string };
}

const WARNING_TYPES = [
  { value: 'verbal', label: 'Llamado de atención verbal', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'written', label: 'Apercibimiento escrito', icon: FileText, color: 'bg-orange-100 text-orange-800' },
  { value: 'lateness', label: 'Llegada tarde', icon: Clock, color: 'bg-blue-100 text-blue-800' },
  { value: 'absence', label: 'Inasistencia', icon: UserX, color: 'bg-red-100 text-red-800' },
  { value: 'suspension', label: 'Suspensión', icon: AlertTriangle, color: 'bg-red-200 text-red-900' },
  { value: 'other', label: 'Otro', icon: AlertTriangle, color: 'bg-gray-100 text-gray-800' },
];

export default function LocalApercibimientos() {
  const { branchId } = useParams();
  const { branch } = useOutletContext<{ branch: Branch }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [showNewWarning, setShowNewWarning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [warningType, setWarningType] = useState('');
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch warnings
  const { data: warnings, isLoading } = useQuery({
    queryKey: ['branch-warnings', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warnings')
        .select(`
          *,
          employee:employees!warnings_user_id_fkey(full_name),
          issuer:profiles!warnings_issued_by_fkey(full_name)
        `)
        .eq('branch_id', branchId!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as Warning[];
    },
    enabled: !!branchId,
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['branch-employees', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('branch_id', branchId!)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Create warning mutation
  const createWarning = useMutation({
    mutationFn: async () => {
      const employee = employees?.find(e => e.id === selectedEmployee);
      if (!employee) throw new Error('Empleado no encontrado');
      
      const { error } = await supabase
        .from('warnings')
        .insert({
          user_id: employee.id, // Use employee id as user_id
          branch_id: branchId!,
          warning_type: warningType,
          description,
          warning_date: incidentDate,
          issued_by: user?.id,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-warnings'] });
      toast.success('Apercibimiento registrado');
      setShowNewWarning(false);
      setSelectedEmployee('');
      setWarningType('');
      setDescription('');
      setIncidentDate(format(new Date(), 'yyyy-MM-dd'));
    },
    onError: (error) => {
      console.error(error);
      toast.error('Error al registrar el apercibimiento');
    },
  });

  const getWarningTypeBadge = (type: string) => {
    const config = WARNING_TYPES.find(t => t.value === type) || WARNING_TYPES[5];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Filter warnings
  const filteredWarnings = warnings?.filter(w => {
    if (!searchQuery) return true;
    return w.employee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           w.description?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  // Stats by type
  const warningsByType = WARNING_TYPES.map(type => ({
    ...type,
    count: warnings?.filter(w => w.warning_type === type.value).length || 0,
  }));

  if (isLoading) {
    return <HoppinessLoader fullScreen size="md" text="Cargando apercibimientos" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Apercibimientos</h1>
          <p className="text-muted-foreground">{branch?.name}</p>
        </div>
        
        <Dialog open={showNewWarning} onOpenChange={setShowNewWarning}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Apercibimiento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Apercibimiento</DialogTitle>
              <DialogDescription>
                Este registro será visible para el empleado en su cuenta
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={warningType} onValueChange={setWarningType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de apercibimiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {WARNING_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Fecha del incidente *</Label>
                <Input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descripción *</Label>
                <Textarea
                  placeholder="Describí la situación..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewWarning(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createWarning.mutate()}
                disabled={!selectedEmployee || !warningType || !description || createWarning.isPending}
              >
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats by type */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {warningsByType.map(type => (
          <Card key={type.value} className={type.count > 0 ? '' : 'opacity-50'}>
            <CardContent className="p-4 text-center">
              <type.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{type.count}</p>
              <p className="text-xs text-muted-foreground truncate">{type.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por empleado o descripción..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Warnings Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Registrado por</TableHead>
              <TableHead>Visto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWarnings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No hay apercibimientos registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredWarnings.map(warning => (
                <TableRow key={warning.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(warning.warning_date), "dd/MM/yy", { locale: es })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {warning.employee?.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{getWarningTypeBadge(warning.warning_type)}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate">{warning.description}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {warning.issuer?.full_name || 'Sistema'}
                  </TableCell>
                  <TableCell>
                    {warning.acknowledged_at ? (
                      <Badge variant="outline" className="gap-1 text-primary">
                        <CheckCircle className="h-3 w-3" />
                        Visto
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pendiente</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
