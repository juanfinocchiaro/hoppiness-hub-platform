import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
  
  // Labor data
  const [monthlyHoursTarget, setMonthlyHoursTarget] = useState('160');
  const [hourlyRate, setHourlyRate] = useState('');

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
      setMonthlyHoursTarget(String(existingData.monthly_hours_target || 160));
      setHourlyRate(existingData.hourly_rate ? String(existingData.hourly_rate) : '');
    }
  }, [existingData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
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
        monthly_hours_target: parseInt(monthlyHoursTarget) || 160,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      };

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
    },
    onSuccess: () => {
      toast.success('Datos guardados');
      queryClient.invalidateQueries({ queryKey: ['employee-data', userId, branchId] });
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error('Error al guardar'),
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horas objetivo/mes</Label>
                <Input 
                  type="number"
                  value={monthlyHoursTarget}
                  onChange={(e) => setMonthlyHoursTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor hora ($)</Label>
                <Input 
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="0.00"
                />
              </div>
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
