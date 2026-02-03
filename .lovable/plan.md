
# Plan: Sistema de Posiciones de Trabajo Configurables

## Resumen del Problema

Actualmente las posiciones de trabajo (Cajero, Cocinero, Runner, Lavacopas) están:
1. **Hardcodeadas en el frontend** (`src/types/workPosition.ts`)
2. **Definidas como ENUM fijo en PostgreSQL** (`work_position_type`)

El usuario necesita:
- Renombrar "Cocinero/a" a "Sandwichero"
- Agregar "Encargado" como posición operativa
- Agregar "Cafetero" como nueva posición

## Solución Propuesta

Migrar de un ENUM fijo a una **tabla configurable** `work_positions`, similar al patrón usado en `brand_closure_config`.

---

## Cambios en Base de Datos

### 1. Nueva Tabla: `work_positions`

```sql
CREATE TABLE public.work_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,        -- Identificador interno (ej: 'sandwichero')
  label text NOT NULL,             -- Etiqueta visible (ej: 'Sandwichero')
  sort_order integer DEFAULT 0,    -- Orden de aparición
  is_active boolean DEFAULT true,  -- Activo/Inactivo
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. Datos Iniciales

Insertar las posiciones actuales + nuevas:

| key | label | sort_order |
|-----|-------|------------|
| cajero | Cajero/a | 1 |
| sandwichero | Sandwichero | 2 |
| cafetero | Cafetero | 3 |
| runner | Runner | 4 |
| lavacopas | Lavacopas | 5 |
| encargado | Encargado | 6 |

### 3. Modificar `employee_schedules`

Actualmente usa el ENUM `work_position_type`. Necesitamos:
- Cambiar `work_position` de ENUM a `text` (o referencia a `work_positions.key`)
- Migrar datos existentes

```sql
-- Cambiar tipo de columna
ALTER TABLE employee_schedules 
  ALTER COLUMN work_position TYPE text;
```

### 4. RLS para `work_positions`

```sql
-- Solo superadmin puede modificar
ALTER TABLE work_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_positions_read" ON work_positions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "work_positions_admin" ON work_positions
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));
```

---

## Cambios en Frontend

### 1. Nuevo Hook: `src/hooks/useWorkPositions.ts`

```typescript
// Obtiene posiciones dinámicas desde la DB
export function useWorkPositions() {
  return useQuery({
    queryKey: ['work-positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_positions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

// Mutaciones para CRUD (solo superadmin)
export function useUpdateWorkPosition() { ... }
export function useCreateWorkPosition() { ... }
```

### 2. Modificar `src/types/workPosition.ts`

Cambiar de tipos fijos a dinámicos:

```typescript
// Mantener tipo genérico para compatibilidad
export type WorkPositionType = string;

// Eliminar WORK_POSITIONS y WORK_POSITION_LABELS hardcodeados
// Ahora vendrán del hook useWorkPositions()
```

### 3. Actualizar `src/components/hr/ScheduleCellPopover.tsx`

Usar el hook en lugar de constantes:

```typescript
import { useWorkPositions } from '@/hooks/useWorkPositions';

// Dentro del componente:
const { data: positions = [] } = useWorkPositions();

// En el Select:
<SelectContent>
  <SelectItem value="none">Sin posición</SelectItem>
  {positions.map((pos) => (
    <SelectItem key={pos.key} value={pos.key}>
      {pos.label}
    </SelectItem>
  ))}
</SelectContent>
```

### 4. Nueva Página de Configuración: `/mimarca/posiciones`

Para que el superadmin pueda:
- Ver lista de posiciones
- Agregar nuevas
- Renombrar existentes
- Activar/desactivar
- Reordenar

### 5. Actualizar Otros Componentes

- `InlineScheduleEditor.tsx` - Para mostrar etiqueta correcta
- `CreateScheduleWizard.tsx` - Usar hook dinámico
- `TeamTable.tsx` / `TeamCardList.tsx` - Mostrar posición del empleado
- `EmployeeDataModal.tsx` - Selector de posición default

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/hooks/useWorkPositions.ts` | Hook para CRUD de posiciones |
| `src/pages/admin/WorkPositionsPage.tsx` | Página de configuración |
| `src/components/admin/WorkPositionsManager.tsx` | Componente de gestión |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/types/workPosition.ts` | Simplificar a tipo string dinámico |
| `src/components/hr/ScheduleCellPopover.tsx` | Usar hook dinámico |
| `src/components/hr/InlineScheduleEditor.tsx` | Usar hook para etiquetas |
| `src/components/hr/CreateScheduleWizard.tsx` | Usar hook dinámico |
| `src/pages/admin/BrandLayout.tsx` | Agregar link a nueva página |

---

## Orden de Implementación

1. **Fase A: Base de Datos**
   - Crear tabla `work_positions`
   - Insertar datos iniciales (con las nuevas posiciones)
   - Modificar columna en `employee_schedules`
   - Configurar RLS

2. **Fase B: Hook y Tipos**
   - Crear `useWorkPositions.ts`
   - Actualizar `workPosition.ts`

3. **Fase C: Componentes de Horarios**
   - Actualizar ScheduleCellPopover
   - Actualizar InlineScheduleEditor
   - Actualizar CreateScheduleWizard

4. **Fase D: Página de Configuración**
   - Crear WorkPositionsPage
   - Agregar a sidebar de Mi Marca

---

## Detalles Técnicos

### Compatibilidad Hacia Atrás

Los valores existentes (`cajero`, `cocinero`, etc.) seguirán funcionando porque se mantendrán las mismas `key`. Solo se renombrará la `label` de "Cocinero/a" a "Sandwichero".

### Migración de Datos

```sql
-- Actualizar registros existentes de 'cocinero' si hubiera
-- (No es necesario si simplemente renombramos la etiqueta)
UPDATE employee_schedules 
SET work_position = 'sandwichero' 
WHERE work_position = 'cocinero';
```

O simplemente mantener `cocinero` como key y cambiar solo el label a "Sandwichero".

### Posiciones Finales Propuestas

| Key | Label | Orden |
|-----|-------|-------|
| cajero | Cajero/a | 1 |
| sandwichero | Sandwichero | 2 |
| cafetero | Cafetero | 3 |
| runner | Runner | 4 |
| lavacopas | Lavacopas | 5 |
| encargado_turno | Encargado de Turno | 6 |
