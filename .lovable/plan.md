

# Plan: Agregar Edición de Rol y Fecha de Ingreso en el Modal de Empleado

## Resumen

Actualizar el modal "Editar datos del empleado" para permitir:
1. **Cambiar el rol** del colaborador en el local
2. **Modificar la fecha de ingreso** a la empresa

Ambos campos se ubicarán en la pestaña **"Laboral"**.

## Estructura Actual vs Propuesta

### Pestaña Laboral - Actual
```
┌─────────────────────────────────────────────┐
│  🔑 PIN de Fichaje                          │
│  [  1234  ] ✅                              │
│  Este PIN es necesario para fichar...       │
└─────────────────────────────────────────────┘
```

### Pestaña Laboral - Propuesta
```
┌─────────────────────────────────────────────┐
│  Rol en el local                            │
│  [ Empleado                            ▼ ]  │
│  ℹ️ Determina los permisos del colaborador. │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📅 Fecha de ingreso                        │
│  [ 15/03/2023 ]                             │
│  ℹ️ Fecha en que comenzó a trabajar.        │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  🔑 PIN de Fichaje                          │
│  [  1234  ] ✅                              │
│  Este PIN es necesario para fichar...       │
└─────────────────────────────────────────────┘
```

## Cambios Técnicos

### Archivo: `src/components/local/team/EmployeeDataModal.tsx`

**1. Actualizar props del componente:**

```typescript
interface EmployeeDataModalProps {
  userId: string;
  branchId: string;
  existingData: EmployeeData | null | undefined;
  currentRole: LocalRole;  // NUEVO
  roleId: string;          // NUEVO
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

**2. Agregar nuevos estados:**

```typescript
import type { LocalRole } from '@/hooks/usePermissionsV2';
import { LOCAL_ROLE_LABELS } from './types';

// Rol
const [selectedRole, setSelectedRole] = useState<LocalRole>(currentRole);

// Fecha de ingreso
const [hireDate, setHireDate] = useState('');
```

**3. Inicializar fecha de ingreso en useEffect:**

```typescript
useEffect(() => {
  if (existingData) {
    // ... campos existentes ...
    setHireDate(existingData.hire_date || '');
  }
}, [existingData]);

// También sincronizar el rol cuando cambie
useEffect(() => {
  setSelectedRole(currentRole);
}, [currentRole]);
```

**4. Actualizar TabsContent "labor":**

```typescript
<TabsContent value="labor" className="space-y-4 mt-4">
  {/* Role Selector - Solo si NO es franquiciado */}
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
          {Object.entries(LOCAL_ROLE_LABELS)
            .filter(([value]) => value !== 'franquiciado')
            .map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
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

  {/* Fecha de ingreso */}
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

  {/* Clock PIN - existente */}
  <div className="space-y-2">
    ...
  </div>
</TabsContent>
```

**5. Actualizar saveMutation:**

```typescript
const saveMutation = useMutation({
  mutationFn: async () => {
    // Validar PIN (existente)
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
      hire_date: hireDate || null,  // NUEVO
    };

    // Guardar datos de empleado (existente)
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

    // Guardar rol si cambió (NUEVO)
    if (selectedRole !== currentRole && roleId) {
      const { error: roleError } = await supabase
        .from('user_branch_roles')
        .update({ local_role: selectedRole })
        .eq('id', roleId);
      if (roleError) throw roleError;
    }

    // Guardar PIN (existente)
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
    queryClient.invalidateQueries({ queryKey: ['branch-team', branchId] });  // NUEVO
    onSuccess();
    onOpenChange(false);
  },
});
```

### Archivo: `src/components/local/team/EmployeeExpandedRow.tsx`

**Actualizar llamada al modal para pasar nuevas props:**

```typescript
{showEditModal && (
  <EmployeeDataModal
    userId={member.user_id}
    branchId={branchId}
    existingData={employeeData}
    currentRole={member.local_role}   // NUEVO
    roleId={member.role_id}           // NUEVO
    open={showEditModal}
    onOpenChange={setShowEditModal}
    onSuccess={() => {
      queryClient.invalidateQueries({ queryKey: ['employee-data', member.user_id, branchId] });
      onMemberUpdated();  // Refrescar lista de equipo
    }}
  />
)}
```

## Imports Adicionales Necesarios

```typescript
// En EmployeeDataModal.tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar } from 'lucide-react';
import type { LocalRole } from '@/hooks/usePermissionsV2';
import { LOCAL_ROLE_LABELS } from './types';
```

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `EmployeeDataModal.tsx` | Agregar props `currentRole` y `roleId`, estados para rol y fecha de ingreso, selector de rol, input de fecha, actualizar mutación |
| `EmployeeExpandedRow.tsx` | Pasar `member.local_role` y `member.role_id` al modal |

## Notas de Seguridad

- El rol "Franquiciado" **no puede ser cambiado** desde este modal (son propietarios del local)
- La fecha de ingreso se guarda en `employee_data.hire_date` que ya existe en la tabla
- El rol se actualiza en `user_branch_roles.local_role`

