import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Clock, Plus, Trash2, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Branch = Tables<'branches'>;

interface LocalContext {
  branch: Branch;
}

interface BranchShift {
  id: string;
  branch_id: string;
  name: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  is_active: boolean;
}

interface ShiftSettings {
  id?: string;
  branch_id: string;
  extended_shift_enabled: boolean;
}

const MAX_SHIFTS = 4;

export default function LocalShiftConfig() {
  const { branch } = useOutletContext<LocalContext>();
  
  const [shifts, setShifts] = useState<BranchShift[]>([]);
  const [settings, setSettings] = useState<ShiftSettings>({
    branch_id: branch?.id || '',
    extended_shift_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (branch?.id) {
      fetchData();
    }
  }, [branch?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch shifts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('branch_shifts')
        .select('*')
        .eq('branch_id', branch.id)
        .eq('is_active', true)
        .order('sort_order');

      if (shiftsError) throw shiftsError;
      setShifts(shiftsData || []);

      // Fetch settings
      const { data: settingsData } = await supabase
        .from('branch_shift_settings')
        .select('*')
        .eq('branch_id', branch.id)
        .maybeSingle();

      if (settingsData) {
        setSettings(settingsData);
      } else {
        setSettings({
          branch_id: branch.id,
          extended_shift_enabled: true,
        });
      }
    } catch (error: any) {
      toast.error('Error al cargar configuración: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateShifts = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (shifts.length === 0) {
      newErrors.general = 'Debe haber al menos un turno configurado';
      setErrors(newErrors);
      return false;
    }

    // Check for overlaps and gaps
    const sortedShifts = [...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time));
    
    for (let i = 0; i < sortedShifts.length; i++) {
      const shift = sortedShifts[i];
      
      if (!shift.name.trim()) {
        newErrors[`name_${shift.id}`] = 'El nombre es obligatorio';
      }
      
      if (!shift.start_time) {
        newErrors[`start_${shift.id}`] = 'Hora de inicio obligatoria';
      }
      
      if (!shift.end_time) {
        newErrors[`end_${shift.id}`] = 'Hora de fin obligatoria';
      }
      
      // Check consecutive shifts match
      if (i < sortedShifts.length - 1) {
        const nextShift = sortedShifts[i + 1];
        if (shift.end_time !== nextShift.start_time) {
          newErrors[`gap_${shift.id}`] = `El fin de "${shift.name}" debe coincidir con el inicio del siguiente turno`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddShift = () => {
    if (shifts.length >= MAX_SHIFTS) {
      toast.error(`Máximo ${MAX_SHIFTS} turnos permitidos`);
      return;
    }

    const lastShift = shifts[shifts.length - 1];
    const newShift: BranchShift = {
      id: `new_${Date.now()}`,
      branch_id: branch.id,
      name: '',
      start_time: lastShift?.end_time || '12:00',
      end_time: '23:00',
      sort_order: shifts.length + 1,
      is_active: true,
    };

    setShifts([...shifts, newShift]);
  };

  const handleRemoveShift = (shiftId: string) => {
    if (shifts.length <= 1) {
      toast.error('Debe haber al menos un turno');
      return;
    }
    setShifts(shifts.filter(s => s.id !== shiftId));
  };

  const handleShiftChange = (shiftId: string, field: keyof BranchShift, value: string) => {
    setShifts(shifts.map(s => 
      s.id === shiftId ? { ...s, [field]: value } : s
    ));
    // Clear related error
    setErrors(prev => {
      const next = { ...prev };
      delete next[`${field}_${shiftId}`];
      delete next[`gap_${shiftId}`];
      return next;
    });
  };

  const handleSave = async () => {
    if (!validateShifts()) {
      toast.error('Por favor corregí los errores antes de guardar');
      return;
    }

    setSaving(true);
    try {
      // Delete existing shifts and insert new ones
      await supabase
        .from('branch_shifts')
        .update({ is_active: false })
        .eq('branch_id', branch.id);

      // Insert or upsert shifts
      for (let i = 0; i < shifts.length; i++) {
        const shift = shifts[i];
        const isNew = shift.id.startsWith('new_');
        
        if (isNew) {
          await supabase.from('branch_shifts').insert({
            branch_id: branch.id,
            name: shift.name,
            start_time: shift.start_time,
            end_time: shift.end_time,
            sort_order: i + 1,
            is_active: true,
          });
        } else {
          await supabase
            .from('branch_shifts')
            .update({
              name: shift.name,
              start_time: shift.start_time,
              end_time: shift.end_time,
              sort_order: i + 1,
              is_active: true,
            })
            .eq('id', shift.id);
        }
      }

      // Upsert settings
      await supabase
        .from('branch_shift_settings')
        .upsert({
          branch_id: branch.id,
          extended_shift_enabled: settings.extended_shift_enabled,
        });

      toast.success('Configuración guardada');
      fetchData();
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración de Turnos</h1>
        <p className="text-muted-foreground">
          Define los turnos de trabajo del local. Los turnos se cierran automáticamente a la hora configurada.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Turnos del Local
          </CardTitle>
          <CardDescription>
            Mínimo 1, máximo {MAX_SHIFTS} turnos. Los horarios deben ser consecutivos sin gaps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.general && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {errors.general}
            </div>
          )}

          <div className="space-y-3">
            {shifts.map((shift, index) => (
              <div 
                key={shift.id} 
                className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-end p-4 border rounded-lg bg-muted/30"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nombre del turno</Label>
                  <Input
                    value={shift.name}
                    onChange={(e) => handleShiftChange(shift.id, 'name', e.target.value)}
                    placeholder="Ej: Mañana, Noche..."
                    className={errors[`name_${shift.id}`] ? 'border-destructive' : ''}
                  />
                  {errors[`name_${shift.id}`] && (
                    <p className="text-xs text-destructive">{errors[`name_${shift.id}`]}</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Inicio</Label>
                  <Input
                    type="time"
                    value={shift.start_time.substring(0, 5)}
                    onChange={(e) => handleShiftChange(shift.id, 'start_time', e.target.value + ':00')}
                    className={`w-28 ${errors[`start_${shift.id}`] ? 'border-destructive' : ''}`}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Input
                    type="time"
                    value={shift.end_time.substring(0, 5)}
                    onChange={(e) => handleShiftChange(shift.id, 'end_time', e.target.value + ':00')}
                    className={`w-28 ${errors[`end_${shift.id}`] ? 'border-destructive' : ''}`}
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveShift(shift.id)}
                  disabled={shifts.length <= 1}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                
                {errors[`gap_${shift.id}`] && (
                  <p className="col-span-4 text-xs text-destructive">{errors[`gap_${shift.id}`]}</p>
                )}
              </div>
            ))}
          </div>

          {shifts.length < MAX_SHIFTS && (
            <Button variant="outline" onClick={handleAddShift} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar turno
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Turno Extendido</CardTitle>
          <CardDescription>
            Los pedidos que entran después del último turno se registran en "Turno Extendido" para análisis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar turno extendido</Label>
              <p className="text-sm text-muted-foreground">
                Permite identificar pedidos fuera de horario
              </p>
            </div>
            <Switch
              checked={settings.extended_shift_enabled}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, extended_shift_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={fetchData} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar
        </Button>
      </div>
    </div>
  );
}
