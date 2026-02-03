
# Plan: Sistema de Copiar y Pegar Horarios

## Resumen

Se implementará una funcionalidad para copiar y pegar horarios de forma eficiente. La idea es permitir copiar el horario de un día (o semana) y pegarlo en otro lugar para acelerar la carga repetitiva.

---

## Opciones de UX

### Opción A: Copiar/Pegar por Día Individual
- Click derecho (o botón "Copiar" en el popover) copia el horario de una celda
- Luego click en otra celda y "Pegar" aplica el mismo horario
- Simple pero tedioso si querés copiar semanas enteras

### Opcion B: Copiar Semana Completa (Recomendada)
- Un botón "Copiar semana" que copia los 7 días de un empleado (ej: Lun-Dom)
- Luego un botón "Pegar semana" que aplica esos 7 días a partir de la fecha que elijas
- Ideal para patrones semanales repetitivos

### Opción C: Híbrido (La más flexible)
- Copiar celda individual
- Copiar semana de un empleado
- Pegar en cualquier lugar (aplica al mismo día de la semana)

**Recomendación:** Opción B (Copiar Semana) porque:
1. Los horarios gastronómicos suelen seguir patrones semanales
2. Copiar día por día es muy tedioso para 31 días
3. Permite llenar un mes completo en 4 clicks

---

## Diseño de la Solución (Opción B)

### Flujo de Trabajo

```text
1. Usuario ve la grilla de horarios del mes
2. Hace click en botón "Copiar semana" al lado de un empleado
3. Se abre selector: ¿Qué semana copiar? (Semana 1, 2, 3, 4...)
4. Sistema guarda en clipboard los 7 días de esa semana
5. Aparece banner "Semana copiada - Selecciona dónde pegar"
6. Usuario hace click en "Pegar" en la fila del mismo o diferente empleado
7. Se despliega selector: ¿A partir de qué fecha pegar?
8. Sistema aplica los 7 días (Lun->Lun, Mar->Mar, etc.) como cambios pendientes
9. Usuario puede ajustar celdas individuales si hace falta
10. Finalmente guarda todos los cambios
```

### Nuevos Elementos de UI

1. **Botón "Copiar semana"** en cada fila de empleado
   - Ícono: Copy o ClipboardCopy
   - Al lado del nombre del empleado o como acción flotante

2. **Banner de clipboard activo**
   - "Semana de [Empleado] copiada (Lun-Dom)"
   - Botón "Cancelar" para limpiar clipboard
   - Se muestra fijo debajo del header

3. **Botón "Pegar" condicional**
   - Aparece en cada fila solo cuando hay algo en el clipboard
   - Abre modal de selección de semana destino

4. **Modal de selección de semana**
   - Lista las semanas del mes (Semana 1: 1-7 Feb, Semana 2: 8-14 Feb, etc.)
   - Preview de qué días se van a modificar
   - Confirmación antes de aplicar

---

## Cambios Técnicos

### Nuevos Estados en InlineScheduleEditor.tsx

```typescript
// Clipboard state
const [clipboard, setClipboard] = useState<{
  sourceUserId: string;
  sourceUserName: string;
  weekData: Map<number, ScheduleValue>; // dayOfWeek (0-6) -> schedule
} | null>(null);
```

### Funciones Nuevas

```typescript
// Copiar semana de un empleado
const handleCopyWeek = (userId: string, userName: string, weekStart: Date) => {
  const weekData = new Map<number, ScheduleValue>();
  
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const dateStr = format(day, 'yyyy-MM-dd');
    const value = getEffectiveValue(userId, dateStr);
    weekData.set(day.getDay(), value);
  }
  
  setClipboard({ sourceUserId: userId, sourceUserName: userName, weekData });
  toast.info(`Semana de ${userName} copiada`);
};

// Pegar semana en otro empleado
const handlePasteWeek = (targetUserId: string, targetUserName: string, targetWeekStart: Date) => {
  if (!clipboard) return;
  
  for (let i = 0; i < 7; i++) {
    const day = addDays(targetWeekStart, i);
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayOfWeek = day.getDay();
    const value = clipboard.weekData.get(dayOfWeek);
    
    if (value) {
      handleCellChange(targetUserId, targetUserName, dateStr, value);
    }
  }
  
  toast.success(`Horario pegado para ${targetUserName}`);
};
```

### Nuevo Componente: CopyPasteControls.tsx

```typescript
interface CopyPasteControlsProps {
  member: TeamMember;
  month: number;
  year: number;
  clipboard: ClipboardData | null;
  onCopyWeek: (weekStart: Date) => void;
  onPasteWeek: (weekStart: Date) => void;
  onClearClipboard: () => void;
}
```

Este componente renderiza:
- Botón "Copiar" con dropdown de semanas
- Botón "Pegar" (solo si hay clipboard) con dropdown de semanas destino

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `InlineScheduleEditor.tsx` | Agregar estado clipboard, funciones copy/paste, UI de botones |
| `ScheduleCellPopover.tsx` | (Opcional) Agregar botón "Copiar celda" para copy individual |

---

## UI Propuesta

### Vista Normal (sin clipboard)

```text
┌─────────────────┬───────┬───────┬───────┬───────┐
│ Juan Pérez  [📋]│ Lun 3 │ Mar 4 │ Mié 5 │ Jue 6 │ ...
├─────────────────┼───────┼───────┼───────┼───────┤
│ María López [📋]│ 19-23 │ 19-23 │Franco │ 19-00 │ ...
└─────────────────┴───────┴───────┴───────┴───────┘

[📋] = Botón "Copiar semana" (dropdown con semanas)
```

### Vista con Clipboard Activo

```text
┌────────────────────────────────────────────────────────────┐
│ 📋 Semana de Juan Pérez copiada (Lun-Dom)  [✕ Cancelar]   │
└────────────────────────────────────────────────────────────┘

┌─────────────────────┬───────┬───────┬───────┬───────┐
│ Juan Pérez  [📋][📥]│ Lun 3 │ Mar 4 │ Mié 5 │ Jue 6 │ ...
├─────────────────────┼───────┼───────┼───────┼───────┤
│ María López [📋][📥]│ 19-23 │ 19-23 │Franco │ 19-00 │ ...
└─────────────────────┴───────┴───────┴───────┴───────┘

[📥] = Botón "Pegar" (dropdown con semanas destino)
```

---

## Consideraciones

1. **El clipboard no persiste** - Se pierde al cambiar de mes o refrescar
2. **Se puede pegar múltiples veces** - Útil para llenar un mes completo
3. **Respeta feriados** - Al pegar, los días feriados se saltan o se pegan vacíos
4. **Validación sigue activa** - El sistema sigue validando 7 días consecutivos

---

## Complejidad Estimada

**Dificultad: Media**
- No requiere cambios en base de datos
- Es todo lógica de UI local
- Usa el sistema existente de `pendingChanges`
- Estimado: 200-300 líneas de código nuevo

---

## Alternativa Simplificada

Si preferís empezar simple:

**Solo copiar la semana actual y pegarla en las siguientes del mismo empleado**

```text
[Botón] "Repetir semana 1 → resto del mes"
```

Esto llenaría automáticamente las semanas 2, 3, 4 con el mismo patrón de la semana 1. 
Un solo botón, sin dropdowns, muy directo.

---

¿Cuál opción preferís?
- **Opción B completa**: Copiar cualquier semana, pegar en cualquier empleado
- **Opción simplificada**: Un botón "Repetir semana" por empleado
