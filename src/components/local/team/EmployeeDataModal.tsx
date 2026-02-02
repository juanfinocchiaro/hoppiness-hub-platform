import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { KeyRound, Check, X } from 'lucide-react';
import type { EmployeeData } from './types';

interface EmployeeDataModalProps {
  userId: string;
  branchId: string;
  existingData: EmployeeData | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EmployeeDataModal({ userId, branchId, existingData, open, onOpenChange, onSuccess }: EmployeeDataModalProps) {
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
  
  // Clock PIN (stored in profiles)
  const [clockPin, setClockPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Fetch current clock_pin from profiles
  const { data: profileData } = useQuery({
    queryKey: ['profile-clock-pin', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('clock_pin')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (profileData?.clock_pin) {
      setClockPin(profileData.clock_pin);
    }
  }, [profileData]);

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
    }
  }, [existingData]);

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

      // Save clock_pin to profiles (only if changed)
      if (clockPin !== (profileData?.clock_pin || '')) {
        const { error: pinError } = await supabase
          .from('profiles')
          .update({ clock_pin: clockPin || null })
          .eq('id', userId);
        if (pinError) throw pinError;
      }
    },
    onSuccess: () => {
      toast.success('Datos guardados');
      queryClient.invalidateQueries({ queryKey: ['employee-data', userId, branchId] });
      queryClient.invalidateQueries({ queryKey: ['profile-clock-pin', userId] });
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
