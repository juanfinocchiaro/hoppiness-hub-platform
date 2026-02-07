
# Plan de Implementación: 4 Mejoras al Sistema de Horarios

## Resumen de Cambios

| # | Problema | Solución |
|---|----------|----------|
| 1a | Falta opción "Vacaciones" | Agregar botón 🏖️ Vacaciones que marca `position: 'vacaciones'` |
| 1b | No permite horarios cortados | Agregar soporte para segundo turno con campos opcionales |
| 1c | Alerta falsa de "7+ días" | Revisar y corregir lógica de validación |
| 2 | Empleado edita nombre | ✅ Ya funciona en `/cuenta/perfil` |
| 3 | "Error desconocido" al guardar | Mejorar captura y visualización del error |
| 4 | Copiar/pegar confuso | Simplificar: copiar 1 horario → pegar en N celdas |

---

## 1. Agregar Opción "Vacaciones"

**Archivo:** `src/components/hr/ScheduleCellPopover.tsx`

Agregar un botón "Vacaciones" debajo de "Franco":

```tsx
<Button
  variant="outline"
  size="sm"
  className="w-full h-9 text-cyan-600 border-cyan-200 hover:bg-cyan-50"
  onClick={handleVacation}
>
  <span className="mr-2">🏖️</span>
  Vacaciones
</Button>
```

La función `handleVacation`:
```tsx
const handleVacation = () => {
  onChange({
    startTime: null,
    endTime: null,
    isDayOff: true,
    position: 'vacaciones',
    breakStart: null,
    breakEnd: null,
  });
  setOpen(false);
};
```

---

## 2. Soporte para Horarios Cortados (Turno Doble)

**Migración de Base de Datos:**
```sql
ALTER TABLE employee_schedules 
  ADD COLUMN IF NOT EXISTS start_time_2 TIME,
  ADD COLUMN IF NOT EXISTS end_time_2 TIME;
```

**Archivo:** `src/components/hr/ScheduleCellPopover.tsx`

Agregar toggle y campos para segundo turno:

```tsx
// Estado
const [hasSplitShift, setHasSplitShift] = useState(false);
const [customStart2, setCustomStart2] = useState('');
const [customEnd2, setCustomEnd2] = useState('');

// UI - debajo del primer turno
{!requiresBreak && (
  <div className="flex items-center gap-2">
    <input 
      type="checkbox" 
      checked={hasSplitShift}
      onChange={(e) => setHasSplitShift(e.target.checked)}
    />
    <Label className="text-xs">Turno cortado (doble jornada)</Label>
  </div>
)}

{hasSplitShift && (
  <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
    <div className="space-y-1.5">
      <Label className="text-xs">2° Entrada</Label>
      <Input type="time" value={customStart2} onChange={...} />
    </div>
    <div className="space-y-1.5">
      <Label className="text-xs">2° Salida</Label>
      <Input type="time" value={customEnd2} onChange={...} />
    </div>
  </div>
)}
```

**Nota:** Los turnos cortados no son compatibles con el break automático (turnos > 6hs).

---

## 3. Corregir Validación de Días Consecutivos

**Archivo:** `src/components/hr/InlineScheduleEditor.tsx` (líneas 460-505)

El problema actual es que la validación cuenta como "día trabajado" cualquier día que tenga un registro en `schedulesWithPending`, incluso si el horario está vacío (00:00-00:00).

Corrección en la lógica:

```tsx
// Antes (buggy):
const isDayOff = s.is_day_off || (!s.start_time && !s.end_time);

// Después (corregido):
const isActuallyWorking = s.start_time && s.end_time && !s.is_day_off &&
  !(s.start_time === '00:00' && s.end_time === '00:00');
const isDayOff = !isActuallyWorking;
```

Además, asegurar que días SIN registro en el schedule sean tratados como francos (no cuenta como día trabajado):

```tsx
monthDays.forEach(day => {
  const dateStr = format(day, 'yyyy-MM-dd');
  const hasSchedule = userScheduleMap.has(dateStr);
  const isDayOff = userScheduleMap.get(dateStr);
  
  // Día es "trabajado" SOLO si tiene schedule Y NO es día libre
  const isWorkingDay = hasSchedule && isDayOff === false;
  
  if (isWorkingDay) {
    consecutiveWorking++;
  } else {
    // Cualquier otro caso (sin schedule, o con franco) → resetear
    if (consecutiveWorking >= 7) {
      violations.push({...});
    }
    consecutiveWorking = 0;
  }
});
```

---

## 4. Mejorar Mensaje de Error al Guardar

**Archivo:** `src/components/hr/InlineScheduleEditor.tsx` (línea 348-350)

Actualmente:
```tsx
onError: (error) => {
  toast.error('Error al guardar: ' + (error instanceof Error ? error.message : 'Error desconocido'));
}
```

Mejorar para capturar errores de Supabase:
```tsx
onError: (error: any) => {
  console.error('Save error details:', error);
  
  let message = 'Error desconocido';
  if (error instanceof Error) {
    message = error.message;
  } else if (error?.message) {
    message = error.message;
  } else if (error?.error_description) {
    message = error.error_description;
  } else if (typeof error === 'object') {
    message = JSON.stringify(error);
  }
  
  toast.error('Error al guardar: ' + message);
}
```

---

## 5. Simplificar Copiar/Pegar

**Archivo:** `src/components/hr/schedule-selection/useScheduleSelection.ts`

**Problema actual:** Cuando copiás múltiples celdas, el sistema guarda un array con offsets relativos. Al pegar, depende de cuántas celdas seleccionaste como destino.

**Nueva lógica simplificada:**

```tsx
// handleCopy - siempre copia la PRIMERA celda seleccionada
const handleCopy = useCallback(() => {
  if (selectedCells.size === 0) return;

  // Tomar la primera celda
  const firstCellKey = Array.from(selectedCells)[0];
  const { userId, date } = parseCellKey(firstCellKey);
  const schedule = getEffectiveValue(userId, date);

  // Guardar solo ese horario
  const clipboardData: ClipboardDataV2 = {
    type: 'cells',
    cells: [{ dayOffset: 0, schedule }],
    sourceInfo: schedule.isDayOff 
      ? 'Franco' 
      : schedule.startTime 
        ? `${schedule.startTime.slice(0,5)}-${schedule.endTime?.slice(0,5)}`
        : 'Vacío',
  };

  setClipboard(clipboardData);
  toast.success(`📋 Copiado: ${clipboardData.sourceInfo}`);
}, [selectedCells, getEffectiveValue]);

// handlePaste - aplica a TODAS las celdas seleccionadas
const handlePaste = useCallback(() => {
  if (!clipboard || selectedCells.size === 0) return;

  const schedule = clipboard.cells[0].schedule;
  const targetCells = Array.from(selectedCells).map(parseCellKey);

  targetCells.forEach(cell => {
    const userName = getTeamMemberName(cell.userId);
    onCellChange(cell.userId, userName, cell.date, schedule);
  });

  toast.success(`✓ Pegado en ${targetCells.length} celda${targetCells.length > 1 ? 's' : ''}`);
  setSelectedCells(new Set());
}, [clipboard, selectedCells, onCellChange, getTeamMemberName]);
```

**Mejora en SelectionToolbar:** Mostrar claramente qué hay copiado:
```tsx
// En el tooltip de Pegar
<TooltipContent side="bottom">
  {clipboard 
    ? `Pegar: ${clipboard.sourceInfo}` 
    : 'Nada copiado'
  }
</TooltipContent>
```

---

## 6. Verificar Edición de Nombre (Item 2)

El campo de nombre en `CuentaPerfil.tsx` (líneas 196-204) ya está habilitado:
```tsx
<Input
  id="fullName"
  value={fullName}
  onChange={(e) => setFullName(e.target.value)}
  placeholder="Tu nombre"
/>
```
No tiene `disabled` - los empleados ya pueden editar su nombre.

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/hr/ScheduleCellPopover.tsx` | Agregar botón Vacaciones + opción turno cortado |
| `src/components/hr/InlineScheduleEditor.tsx` | Corregir validación + mejor manejo de errores |
| `src/components/hr/schedule-selection/useScheduleSelection.ts` | Simplificar copiar/pegar |
| `src/components/hr/schedule-selection/SelectionToolbar.tsx` | Mejorar feedback visual |
| `src/components/hr/schedule-selection/types.ts` | Actualizar tipo ClipboardDataV2 |

## Migración de Base de Datos

```sql
-- Soporte para turno cortado (split shift)
ALTER TABLE employee_schedules 
  ADD COLUMN IF NOT EXISTS start_time_2 TIME,
  ADD COLUMN IF NOT EXISTS end_time_2 TIME;
```

---

## Flujo de Usuario Mejorado

### Copiar/Pegar (nuevo comportamiento):
1. Seleccionar UNA celda (o varias, se toma la primera)
2. Ctrl+C → Toast: "📋 Copiado: 19:00-02:00"
3. Seleccionar las celdas destino (Ctrl+Click o Shift+Click)
4. Ctrl+V → Toast: "✓ Pegado en 5 celdas"

### Vacaciones:
1. Click en celda vacía
2. Click en "🏖️ Vacaciones"
3. Celda muestra "🏖️ Vac"

### Turno Cortado:
1. Click en celda
2. Ingresar primer turno (ej: 10:00-14:00)
3. Marcar "Turno cortado"
4. Ingresar segundo turno (ej: 18:00-22:00)
5. Celda muestra "10-14 / 18-22"
