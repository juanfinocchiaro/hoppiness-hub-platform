
# Plan: Resolución de 10 Issues del Sistema

## Resumen Ejecutivo

Este plan aborda los 10 problemas reportados organizados por prioridad y complejidad. Cada issue incluye diagnóstico, solución propuesta y archivos afectados.

---

## Issue 1: Cierre Automático del Popover de Calendario en Apercibimientos

**Problema**: Al seleccionar una fecha en el modal de apercibimientos, el panel del calendario no se cierra automáticamente.

**Archivo afectado**: `src/components/local/team/WarningModal.tsx`

**Solución**: Agregar estado para controlar el Popover y cerrarlo al seleccionar fecha.

```text
Cambios en WarningModal.tsx (líneas 44-45 y 384-394):

1. Agregar estado:
   const [calendarOpen, setCalendarOpen] = useState(false);

2. Modificar el Popover:
   <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
     ...
     <Calendar
       onSelect={(d) => {
         if (d) setDate(d);
         setCalendarOpen(false);  // Cerrar al seleccionar
       }}
     />
   </Popover>
```

---

## Issue 2: Turnos Rotativos 100% Personalizables

**Problema**: El wizard de horarios usa presets fijos (Mañana 09-17, Tarde 14-22, etc.) en lugar de permitir ingresar horarios libres.

**Archivo afectado**: `src/components/hr/CreateScheduleWizard.tsx`

**Solución**: Agregar inputs de hora directamente en cada día del calendario, además de los presets.

```text
Cambios:

1. Agregar nuevos estados para edición inline:
   const [editingDay, setEditingDay] = useState<string | null>(null);
   const [customStart, setCustomStart] = useState('');
   const [customEnd, setCustomEnd] = useState('');

2. En la grilla del calendario (renderStep3), al hacer click en un día:
   - Si ya está seleccionado, abrir mini-formulario inline
   - Mostrar inputs type="time" para start/end
   - Botón "Aplicar" que actualiza scheduleData[dateStr]

3. Modificar la UI del día para incluir:
   - Click 1: Seleccionar día
   - Click 2 (o doble click): Abrir editor inline con inputs de hora
   - Alternativa: Agregar sección debajo de la grilla "Editar seleccionados"
     con inputs de hora personalizables
```

**UI Propuesta**:
```
┌─────────────────────────────────────────────────┐
│ Días seleccionados: Lun 3, Mar 4, Mié 5         │
├─────────────────────────────────────────────────┤
│ Hora inicio: [ 19:30 ]  Hora fin: [ 23:30 ]     │
│ ☐ Es franco                                     │
│ [Aplicar a seleccionados]                       │
└─────────────────────────────────────────────────┘
```

---

## Issue 3: Error RLS en employee_schedules

**Problema**: `new row violates row-level security policy for table employee_schedules`

**Diagnóstico**: Revisando las políticas RLS actuales:
- `employee_schedules_hr` permite INSERT/UPDATE con `is_hr_role(auth.uid(), branch_id)`
- La función `is_hr_role` verifica superadmin o local_role IN ('franquiciado', 'encargado') con branch_ids

**Causa probable**: El INSERT en `useSaveMonthlySchedule` incluye `employee_id: input.user_id` que es un campo legacy. La política RLS podría estar fallando porque:
1. El usuario logueado no tiene el branch_id en su array `branch_ids`
2. La función `is_hr_role` usa `branch_ids` de `user_roles_v2` pero el sistema ahora usa `user_branch_roles`

**Archivo afectado**: Migración SQL + `src/hooks/useSchedules.ts`

**Solución**:

```sql
-- Verificar si is_hr_role está consultando la tabla correcta
-- La función actual usa user_roles_v2.branch_ids pero el sistema 
-- migró a user_branch_roles

-- Opción 1: Actualizar la función is_hr_role para usar user_branch_roles
CREATE OR REPLACE FUNCTION public.is_hr_role(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_branch_roles
    WHERE user_id = _user_id 
    AND branch_id = _branch_id
    AND local_role IN ('franquiciado', 'encargado')
    AND is_active = true
  )
$$;
```

**Nota**: Ya existe `is_hr_for_branch_v2` que hace exactamente esto. Habría que:
1. Actualizar la política RLS de `employee_schedules` para usar `is_hr_for_branch_v2` en lugar de `is_hr_role`, O
2. Modificar `is_hr_role` para que consulte `user_branch_roles`

---

## Issue 4: Apercibimientos Duplicado en UI

**Problema**: Apercibimientos aparece en:
- Sidebar: Equipo → Apercibimientos (`/milocal/:branchId/equipo/apercibimientos`)
- Dentro de TeamPage: EmployeeExpandedRow tiene botón "Apercibimientos"

**Análisis**: Ambos flujos son válidos pero confusos:
- Desde sidebar: ver lista global de apercibimientos del local
- Desde equipo: crear apercibimiento para un empleado específico

**Solución recomendada**: Mantener UN solo flujo:

**Opción A (Recomendada)**: Mantener apercibimientos en la fila expandida del empleado
- Eliminar entrada del sidebar
- El flujo natural es: Mi Equipo → Expandir empleado → Apercibimientos

**Archivo afectado**: `src/pages/local/BranchLayout.tsx`

```typescript
// Línea ~201: Eliminar o comentar
// { to: 'equipo/apercibimientos', label: 'Apercibimientos', icon: AlertTriangle, show: lp.canViewTeam },
```

---

## Issue 5: Encargado Seleccionar Destinatario de Mensaje

**Problema**: El encargado no puede elegir a quién envía un comunicado, va a todo el equipo.

**Archivo afectado**: `src/pages/local/LocalCommunicationsPage.tsx`

**Solución**: Agregar selector de destinatarios en el modal de nuevo mensaje.

```text
Cambios:

1. Agregar query para obtener miembros del equipo:
   const { data: teamMembers } = useQuery({...user_branch_roles...});

2. Agregar estados:
   const [targetType, setTargetType] = useState<'all' | 'selected'>('all');
   const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

3. Agregar en el DialogContent antes del botón Enviar:
   <div className="space-y-2">
     <Label>Destinatarios</Label>
     <RadioGroup value={targetType} onValueChange={setTargetType}>
       <RadioGroupItem value="all">Todo el equipo</RadioGroupItem>
       <RadioGroupItem value="selected">Seleccionar empleados</RadioGroupItem>
     </RadioGroup>
     
     {targetType === 'selected' && (
       <div className="space-y-2 max-h-40 overflow-y-auto">
         {teamMembers?.map(member => (
           <div className="flex items-center gap-2">
             <Checkbox 
               checked={selectedUsers.includes(member.user_id)}
               onCheckedChange={...}
             />
             <span>{member.full_name}</span>
           </div>
         ))}
       </div>
     )}
   </div>

4. En createMutation, agregar target_user_ids al insert si selectedUsers.length > 0
   (requiere agregar columna target_user_ids a communications o usar otra lógica)
```

---

## Issue 6: Encargado Ver URL y QR de Fichaje

**Problema**: El encargado no ve el link de fichaje ni el QR en ningún lado.

**Ubicación actual**: Existe `/fichaje-qr/:branchId` (FichajeQRDisplay.tsx) pero no hay link para accederlo.

**Solución**: Agregar card o botón en ManagerDashboard o en la config del local.

**Archivo afectado**: `src/components/local/ManagerDashboard.tsx`

```text
Cambios:

1. Agregar sección después de "Pendientes":

<Card>
  <CardHeader className="pb-2">
    <CardTitle className="flex items-center gap-2 text-base">
      <QrCode className="w-4 h-4" />
      Fichaje del Local
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <p className="text-sm text-muted-foreground">
      Código: <span className="font-mono font-bold">{branch.clock_code}</span>
    </p>
    
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => {
          const url = `${window.location.origin}/fichaje/${branch.clock_code}`;
          navigator.clipboard.writeText(url);
          toast.success('Link copiado al portapapeles');
        }}
      >
        <Link className="w-4 h-4 mr-2" />
        Copiar Link
      </Button>
      
      <Link to={`/fichaje-qr/${branch.id}`} target="_blank">
        <Button variant="outline" size="sm">
          <QrCode className="w-4 h-4 mr-2" />
          Ver QR Completo
        </Button>
      </Link>
    </div>
  </CardContent>
</Card>
```

---

## Issue 7: Verificar URL/QR de Fichaje No Funciona

**Problema**: El link de fichaje no funciona correctamente.

**Diagnóstico necesario**: 
- La ruta es `/fichaje/:branchCode` (usando clock_code, no branchId)
- FichajeQRDisplay genera URL: `${origin}/fichaje/${branch.clock_code}`
- Verificar que el clock_code esté configurado en la sucursal

**Posibles causas**:
1. La sucursal no tiene `clock_code` configurado en la base de datos
2. El `clock_code` tiene caracteres especiales
3. FichajeEmpleado.tsx no maneja correctamente el código

**Solución**: 
1. Verificar en la base de datos que `branches.clock_code` tenga valor para todas las sucursales
2. Si no lo tiene, generar uno automáticamente (ej: primeras 3 letras del nombre + random)

---

## Issue 8: Error al Enviar Comunicado como Encargado

**Problema**: RLS bloquea el INSERT de comunicados para encargados.

**Diagnóstico**: La política actual en `communications`:
```sql
-- Local managers can manage local communications
WHERE source_type = 'local' 
  AND local_role IN ('encargado', 'franquiciado') 
  AND source_branch_id = ANY(user_roles_v2.branch_ids)
```

Pero el sistema ahora usa `user_branch_roles` en lugar de `user_roles_v2.branch_ids`.

**Solución**: Actualizar la política RLS para usar la función `is_hr_for_branch_v2` que consulta `user_branch_roles`.

```sql
-- Reemplazar política existente
DROP POLICY IF EXISTS "Local managers can manage local communications" ON communications;

CREATE POLICY "Local managers can manage local communications"
ON communications FOR ALL
TO authenticated
USING (
  source_type = 'local' 
  AND is_hr_for_branch_v2(auth.uid(), source_branch_id)
)
WITH CHECK (
  source_type = 'local' 
  AND is_hr_for_branch_v2(auth.uid(), source_branch_id)
);
```

---

## Issue 9: Modificar Sistema de Adelantos

**Problema**: 
- No debe haber "transferencias pendientes" como adelantos
- Debe ser registro de lo ya realizado (efectivo o transferencia)
- Debe permitir ver historial mes a mes

**Archivo afectado**: `src/pages/local/AdvancesPage.tsx` + `src/hooks/useSalaryAdvances.ts`

**Cambios requeridos**:

```text
1. Eliminar status 'pending_transfer':
   - En useCreateAdvance: si paymentMethod === 'transfer', status = 'transferred' (no 'pending_transfer')
   - Eliminar la pestaña "Pend. Transf." y la lógica de "Marcar Transferido"

2. Agregar filtro por mes:
   - Estado: const [selectedMonth, setSelectedMonth] = useState(new Date());
   - Selector de mes/año en la UI
   - Modificar query para filtrar por created_at >= startOfMonth AND <= endOfMonth

3. UI propuesta:
   ┌─────────────────────────────────────────────┐
   │ [◀] Febrero 2026 [▶]                        │
   ├─────────────────────────────────────────────┤
   │ Total del mes: $45.000                      │
   │ Efectivo: $30.000 | Transferencia: $15.000  │
   └─────────────────────────────────────────────┘
```

---

## Issue 10: "Crear Pin" No Funciona en Mi Cuenta

**Problema**: El botón "Crear Pin" abre algo incorrecto.

**Archivo afectado**: `src/pages/cuenta/CuentaPerfil.tsx`

**Diagnóstico**: Revisando el código actual (líneas 415-470), el PIN de fichaje está correctamente implementado como un formulario independiente. El input y el botón "Guardar PIN" deberían funcionar.

**Posibles causas**:
1. En `CuentaDashboard.tsx`, el `MissingPinBanner` tiene un link/botón que va a otro lugar
2. El enlace "Mi Perfil" no está llevando a la sección correcta

**Verificar**: `src/components/cuenta/MissingPinBanner.tsx`

**Solución probable**: El banner probablemente tiene un onClick o Link que no va a `/cuenta/perfil`. Hay que verificar y corregir para que lleve directamente a la sección de PIN o a `/cuenta/perfil`.

---

## Resumen de Archivos a Modificar

| Issue | Archivo(s) | Tipo |
|-------|-----------|------|
| 1 | WarningModal.tsx | Frontend |
| 2 | CreateScheduleWizard.tsx | Frontend |
| 3 | Migración SQL (is_hr_role / employee_schedules RLS) | Backend |
| 4 | BranchLayout.tsx | Frontend |
| 5 | LocalCommunicationsPage.tsx | Frontend |
| 6 | ManagerDashboard.tsx | Frontend |
| 7 | Verificar branches.clock_code | Backend/Data |
| 8 | Migración SQL (communications RLS) | Backend |
| 9 | AdvancesPage.tsx + useSalaryAdvances.ts | Frontend |
| 10 | MissingPinBanner.tsx | Frontend |

## Orden de Prioridad Sugerido

1. **Issue 3 + 8** (RLS) - Bloquean funcionalidad core
2. **Issue 10** - UX crítica para empleados
3. **Issue 1** - UX rápida de resolver
4. **Issue 4** - Limpieza de UI
5. **Issue 6** - Funcionalidad necesaria
6. **Issue 7** - Diagnóstico y fix
7. **Issue 9** - Rediseño de adelantos
8. **Issue 5** - Feature de comunicados dirigidos
9. **Issue 2** - Turnos personalizables (más complejo)

