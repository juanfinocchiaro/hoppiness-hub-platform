import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { KeyRound, Check, X, Calendar } from 'lucide-react';
import type { EmployeeData, LOCAL_ROLE_LABELS } from './types';
import type { LocalRole } from '@/hooks/usePermissionsV2';

const ROLE_OPTIONS: { value: LocalRole; label: string }[] = [
  { value: 'encargado', label: 'Encargado' },
  { value: 'contador_local', label: 'Contador Local' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'empleado', label: 'Empleado' },
];

interface EmployeeDataModalProps {
  userId: string;
  branchId: string;
  existingData: EmployeeData | null | undefined;
  currentRole: LocalRole;
  roleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EmployeeDataModal({ userId, branchId, existingData, currentRole, roleId, open, onOpenChange, onSuccess }: EmployeeDataModalProps) {
  const queryClient = useQueryClient();
  
  // Personal data
  const [dni, setDni] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [personalAddress, setPersonalAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
  // Banking data
  const [bankName, setBankName] = useState('');
  const [cbu, setCbu] = useState('');
  const [alias, setAlias] = useState('');
  const [cuil, setCuil] = useState('');
  
  // Labor data
  const [selectedRole, setSelectedRole] = useState<LocalRole>(currentRole);
  const [hireDate, setHireDate] = useState('');
  
  // Clock PIN (stored in user_branch_roles)
  const [clockPin, setClockPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAvailable, setPinAvailable] = useState<boolean | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Fetch current clock_pin from user_branch_roles
  const { data: roleData } = useQuery({
    queryKey: ['branch-role-clock-pin', roleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_branch_roles')
        .select('clock_pin')
        .eq('id', roleId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!roleId,
  });

  useEffect(() => {
    if (roleData?.clock_pin) {
      setClockPin(roleData.clock_pin);
    }
  }, [roleData]);

  // Check PIN availability in this branch
  const checkPinAvailability = async (pin: string) => {
    if (pin.length !== 4) {
      setPinAvailable(null);
      return;
    }
    setCheckingPin(true);
    try {
      const { data, error } = await supabase.rpc('is_clock_pin_available', {
        _branch_id: branchId,
        _pin: pin,
        _exclude_user_id: userId,
      });
      if (error) throw error;
      setPinAvailable(data);
    } catch (error) {
      console.error('Error checking PIN:', error);
      setPinAvailable(null);
    } finally {
      setCheckingPin(false);
    }
  };

  useEffect(() => {
    if (existingData) {
      setDni(existingData.dni || '');
      setBirthDate(existingData.birth_date || '');
      setPersonalAddress(existingData.personal_address || '');
      setEmergencyContact(existingData.emergency_contact || '');
      setEmergencyPhone(existingData.emergency_phone || '');
      setBankName(existingData.bank_name || '');
      setCbu(existingData.cbu || '');
      setAlias(existingData.alias || '');
      setCuil(existingData.cuil || '');
      setHireDate(existingData.hire_date || '');
    }
  }, [existingData]);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole]);

  const validatePin = (pin: string): boolean => {
    if (!pin) return true; // Empty is valid (optional)
    if (!/^\d{4}$/.test(pin)) {
      setPinError('El PIN debe ser de 4 dígitos');
      return false;
    }
    setPinError('');
    return true;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate PIN
      if (clockPin && !validatePin(clockPin)) {
        throw new Error('PIN inválido');
      }

      const data = {
        user_id: userId,
        branch_id: branchId,
        dni: dni || null,
        birth_date: birthDate || null,
        personal_address: personalAddress || null,
        emergency_contact: emergencyContact || null,
        emergency_phone: emergencyPhone || null,
        bank_name: bankName || null,
        cbu: cbu || null,
        alias: alias || null,
        cuil: cuil || null,
        hire_date: hireDate || null,
      };

      // Save employee data
      if (existingData?.id) {
        const { error } = await supabase
          .from('employee_data')
          .update(data)
          .eq('id', existingData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employee_data')
          .insert(data);
        if (error) throw error;
      }

      // Save role if changed
      if (selectedRole !== currentRole && roleId) {
        const { error: roleError } = await supabase
          .from('user_branch_roles')
          .update({ local_role: selectedRole })
          .eq('id', roleId);
        if (roleError) throw roleError;
      }

      // Save clock_pin to user_branch_roles (only if changed)
      if (clockPin !== (roleData?.clock_pin || '')) {
        // Check availability first
        if (clockPin) {
          const { data: available, error: checkError } = await supabase.rpc('is_clock_pin_available', {
            _branch_id: branchId,
            _pin: clockPin,
            _exclude_user_id: userId,
          });
          if (checkError) throw checkError;
          if (!available) throw new Error('Este PIN ya está en uso en esta sucursal');
        }

        const { error: pinError } = await supabase
          .from('user_branch_roles')
          .update({ clock_pin: clockPin || null })
          .eq('id', roleId);
        if (pinError) throw pinError;
      }
    },
    onSuccess: () => {
      toast.success('Datos guardados');
      queryClient.invalidateQueries({ queryKey: ['employee-data', userId, branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-role-clock-pin', roleId] });
      queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Error al guardar'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar datos del empleado</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="personal" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="banking">Bancarios</TabsTrigger>
            <TabsTrigger value="labor">Laboral</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input 
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="12.345.678"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input 
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input 
                value={personalAddress}
                onChange={(e) => setPersonalAddress(e.target.value)}
                placeholder="Calle 123, Ciudad"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contacto de emergencia</Label>
                <Input 
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono emergencia</Label>
                <Input 
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+54 351 ..."
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="banking" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input 
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Banco Galicia"
              />
            </div>
            <div className="space-y-2">
              <Label>CBU</Label>
              <Input 
                value={cbu}
                onChange={(e) => setCbu(e.target.value)}
                placeholder="0070055530004..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Alias</Label>
                <Input 
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="NOMBRE.APELLIDO.BANCO"
                />
              </div>
              <div className="space-y-2">
                <Label>CUIL</Label>
                <Input 
                  value={cuil}
                  onChange={(e) => setCuil(e.target.value)}
                  placeholder="20-12345678-9"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="labor" className="space-y-4 mt-4">
            {/* Role Selector - Only if NOT franquiciado */}
            {currentRole !== 'franquiciado' && (
              <div className="space-y-2">
                <Label>Rol en el local</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => setSelectedRole(v as LocalRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Determina los permisos y acceso del colaborador en este local.
                </p>
              </div>
            )}

            <Separator />

            {/* Hire Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de ingreso
              </Label>
              <Input 
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Fecha en que el colaborador comenzó a trabajar en la empresa.
              </p>
            </div>

            <Separator />

            {/* Clock PIN */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                PIN de Fichaje
              </Label>
              <div className="flex gap-2 items-center">
                <Input 
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={clockPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setClockPin(val);
                    if (val && val.length === 4) {
                      setPinError('');
                    }
                  }}
                  placeholder="4 dígitos"
                  className="max-w-32 text-center text-lg tracking-widest"
                />
                {clockPin.length === 4 && (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                {pinError && (
                  <X className="h-5 w-5 text-destructive" />
                )}
              </div>
              {pinError && (
                <p className="text-sm text-destructive">{pinError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Este PIN es necesario para fichar entrada/salida con el código QR de la sucursal.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
