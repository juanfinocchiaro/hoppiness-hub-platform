
# Plan: Día de Cumpleaños + Posición Predefinida + Justificación de Faltas

## Resumen de Cambios Solicitados

1. **Día de Cumpleaños**: Regalo de 1 día libre por cumpleaños, que se puede usar cualquier día del mes
2. **Posición Predefinida en Popover**: Cuando se abre el popover para configurar horario, debe cargar la posición habitual del empleado
3. **Sistema de Justificación de Faltas**: El empleado envía justificativo, el encargado decide si lo acepta

---

## 1. Día de Cumpleaños (Franco Extra Mensual)

### Concepto
- Es un "franco extra" regalado que NO se paga como hora extra
- El empleado puede tomarlo el día de su cumpleaños u otro día del mes
- Es transferible dentro del mes, no acumulativo

### Implementación

**Opción A: Usar `employee_schedules` con tipo especial**

Agregar un campo o usar `work_position = 'birthday'` para marcar el día como "Franco Cumple"

```text
employee_schedules
├── is_day_off = true
└── work_position = 'cumple' (nuevo valor especial)
```

**Opción B: Usar `schedule_requests` con tipo `birthday`**

Agregar un nuevo `request_type = 'birthday'` que funciona diferente:
- El encargado puede crear una solicitud aprobada automáticamente
- O el sistema detecta el mes de cumpleaños y muestra opción

### UI Propuesta

En el **popover de horarios** (`ScheduleCellPopover.tsx`), agregar debajo de "Franco":

```text
+----------------------------------+
|  Franco (día libre)              |
+----------------------------------+
|  🎂 Cumple (franco mensual)      |  <-- Nuevo botón
+----------------------------------+
```

Este botón:
- Solo aparece si el empleado tiene cumple ese mes Y no lo usó aún
- Marca el día como `is_day_off = true` con `work_position = 'cumple'`
- Se visualiza en la grilla con 🎂 en lugar de "Franco"

### Datos Necesarios

Para saber el cumpleaños, usar `employee_data.birth_date`:

```typescript
// En InlineScheduleEditor, agregar query de birth_dates
const { data: employeeData } = useQuery({
  queryKey: ['employee-birthdays', branchId],
  queryFn: async () => {
    const { data } = await supabase
      .from('employee_data')
      .select('user_id, birth_date')
      .eq('branch_id', branchId);
    return data || [];
  }
});
```

### Validación
- Solo 1 uso de "Cumple" por empleado por mes
- Si ya existe un día con `work_position = 'cumple'` en el mes, no permitir otro

---

## 2. Posición Predefinida en Popover

### Problema Actual
El popover siempre inicia con "Sin posición" aunque el empleado tenga `default_position` configurado.

### Solución

**Modificar `ScheduleCellPopover.tsx`**:

1. Agregar nuevo prop `defaultPosition`:

```typescript
interface ScheduleCellPopoverProps {
  // ... existentes
  defaultPosition?: string | null;  // <-- Nuevo
}
```

2. Modificar el `useEffect` que inicializa valores:

```typescript
useEffect(() => {
  if (open) {
    setCustomStart(value.startTime || '19:30');
    setCustomEnd(value.endTime || '23:30');
    // Usar posición del turno existente, o default del empleado
    setPosition(value.position || defaultPosition || '');
    // ...
  }
}, [open, value, defaultPosition]);
```

**Modificar `InlineScheduleEditor.tsx`**:

Pasar `defaultPosition` al popover:

```tsx
<ScheduleCellPopover
  key={dateStr}
  value={value}
  onChange={(newValue) => handleCellChange(member.id, member.full_name, dateStr, newValue)}
  disabled={!isEditable}
  employeeName={member.full_name}
  dateLabel={format(day, "EEEE d 'de' MMMM", { locale: es })}
  defaultPosition={member.default_position}  // <-- Nuevo
>
```

---

## 3. Sistema de Justificación de Faltas

### Flujo

```text
1. Empleado falta un día programado
2. Empleado envía justificativo desde "Mi Cuenta" 
   (tipo: enfermedad, motivo personal, emergencia, etc.)
3. Puede adjuntar evidencia (foto certificado médico, etc.)
4. Encargado ve solicitud en panel de "Solicitudes Pendientes"
5. Encargado decide:
   - ✅ Justificar: Marca como falta justificada, sube evidencia si corresponde
   - ❌ No justificar: La falta queda como injustificada (afecta presentismo)
```

### Cambios en Base de Datos

Agregar nuevos tipos a `schedule_requests.request_type`:

```sql
-- Tipos actuales: 'day_off', 'shift_change', 'other'
-- Agregar: 'absence_justification'
```

Agregar campo para evidencia:

```sql
ALTER TABLE schedule_requests 
ADD COLUMN evidence_url TEXT NULL,
ADD COLUMN absence_type TEXT NULL; -- 'medical', 'personal', 'emergency', 'other'
```

### UI Empleado (RequestDayOffModal.tsx)

Agregar nuevo tipo de solicitud:

```typescript
type RequestType = 'day_off' | 'shift_change' | 'absence_justification' | 'other';
```

Cuando sea `absence_justification`:
- Fecha debe ser pasada o actual (ya faltó)
- Mostrar selector de tipo de ausencia
- Campo para subir foto de justificativo

### UI Encargado (PendingScheduleRequests.tsx)

Para solicitudes de tipo `absence_justification`:
- Mostrar la evidencia adjunta si existe
- Botón "Justificar" sube el comprobante y marca como justificada
- Botón "No Justificar" rechaza (falta injustificada)

### Impacto en Presentismo

En `useLaborHours.ts`, la query de ausencias ya filtra por tipo:

```typescript
.in('request_type', ['absence', 'sick_leave', 'justified_absence', 'unjustified_absence']);
```

- Si `status = 'approved'` → Falta justificada (no afecta presentismo)
- Si `status = 'rejected'` → Falta injustificada (afecta presentismo)

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/hr/ScheduleCellPopover.tsx` | Agregar prop `defaultPosition`, inicializar posición con default, botón "Cumple" |
| `src/components/hr/InlineScheduleEditor.tsx` | Pasar `defaultPosition` al popover, query de cumpleaños, lógica de "cumple usado" |
| `src/components/cuenta/RequestDayOffModal.tsx` | Nuevo tipo `absence_justification`, subida de evidencia |
| `src/components/hr/PendingScheduleRequests.tsx` | Mostrar evidencia, lógica de justificación |
| **Migración SQL** | Campo `evidence_url` y `absence_type` en `schedule_requests` |

---

## Detalle Técnico: Posición Predefinida

### ScheduleCellPopover.tsx

```typescript
interface ScheduleCellPopoverProps {
  children: React.ReactNode;
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
  disabled?: boolean;
  employeeName?: string;
  dateLabel?: string;
  defaultPosition?: string | null;  // NUEVO
}

export function ScheduleCellPopover({
  children,
  value,
  onChange,
  disabled = false,
  employeeName,
  dateLabel,
  defaultPosition,  // NUEVO
}: ScheduleCellPopoverProps) {
  // ...
  
  useEffect(() => {
    if (open) {
      setCustomStart(value.startTime || '19:30');
      setCustomEnd(value.endTime || '23:30');
      // Usar posición existente del turno, o la predefinida del empleado
      setPosition(value.position || defaultPosition || '');
      setBreakStart(value.breakStart || '');
      setBreakEnd(value.breakEnd || '');
    }
  }, [open, value, defaultPosition]);
```

### InlineScheduleEditor.tsx (línea ~733)

```tsx
<ScheduleCellPopover
  key={dateStr}
  value={value}
  onChange={(newValue) => handleCellChange(member.id, member.full_name, dateStr, newValue)}
  disabled={!isEditable}
  employeeName={member.full_name}
  dateLabel={format(day, "EEEE d 'de' MMMM", { locale: es })}
  defaultPosition={member.default_position}  // NUEVO - member ya tiene este campo
>
```

---

## Detalle Técnico: Día de Cumpleaños

### Nuevo ScheduleValue

```typescript
export interface ScheduleValue {
  startTime: string | null;
  endTime: string | null;
  isDayOff: boolean;
  isBirthdayOff?: boolean;  // NUEVO - distingue cumple de franco normal
  position: WorkPositionType | null;
  breakStart?: string | null;
  breakEnd?: string | null;
}
```

### ScheduleCellPopover - Botón Cumple

```tsx
{/* Quick action: Day off */}
<Button variant="outline" size="sm" className="w-full h-9" onClick={handleDayOff}>
  Franco (día libre)
</Button>

{/* Birthday day off - only if birthday month and not used */}
{hasBirthdayThisMonth && !birthdayUsedThisMonth && (
  <Button 
    variant="outline" 
    size="sm" 
    className="w-full h-9 text-pink-600 border-pink-200 hover:bg-pink-50"
    onClick={handleBirthdayOff}
  >
    <span className="mr-2">🎂</span>
    Cumple (franco mensual)
  </Button>
)}
```

### InlineScheduleEditor - Detectar cumpleaños

```typescript
// Agregar query de cumpleaños
const { data: birthdayData = [] } = useQuery({
  queryKey: ['employee-birthdays', branchId],
  queryFn: async () => {
    const { data } = await supabase
      .from('employee_data')
      .select('user_id, birth_date')
      .eq('branch_id', branchId);
    return data || [];
  },
  enabled: !!branchId,
});

// Map de user_id -> birth_date
const birthdayMap = useMemo(() => 
  new Map(birthdayData.map(e => [e.user_id, e.birth_date])),
  [birthdayData]
);

// Detectar si ya usó cumple este mes
const birthdayUsedMap = useMemo(() => {
  const used = new Map<string, boolean>();
  schedulesWithPending.forEach(s => {
    if (s.work_position === 'cumple') {
      used.set(s.user_id, true);
    }
  });
  return used;
}, [schedulesWithPending]);
```

---

## Criterios de Aceptación

- [ ] Al abrir popover de horario, la posición se pre-carga con la posición habitual del empleado
- [ ] Si el empleado cumple años en el mes actual, aparece opción "Cumple" en el popover
- [ ] Solo se puede usar 1 día de cumple por mes por empleado
- [ ] El día de cumple se visualiza con 🎂 en la grilla
- [ ] Los empleados pueden enviar justificativos de faltas desde Mi Cuenta
- [ ] Los justificativos pueden incluir evidencia (foto)
- [ ] Los encargados pueden aprobar/rechazar justificativos
- [ ] Las faltas justificadas no afectan el presentismo
