
# Plan: Corrección de Auditoría de Código

## Análisis de la Auditoría

La auditoría es **100% precisa**. Todos los hallazgos fueron verificados en el código actual.

---

## CRÍTICOS - Correcciones Inmediatas

### 1. Ruta de Impresoras en Menú (Sin Página)

**Estado:** El menú en `BranchLayout.tsx:214` tiene link a `config/impresoras` pero la página fue eliminada y no hay ruta en App.tsx.

**Acción:** Eliminar el item del menú ya que el sistema de impresoras se eliminó en la limpieza anterior.

```tsx
// BranchLayout.tsx - ANTES
items: [
  { to: 'config/turnos', label: 'Turnos', icon: Clock, show: lp.canConfigPrinters },
  { to: 'config/impresoras', label: 'Impresoras', icon: Printer, show: lp.canConfigPrinters },
]

// DESPUÉS
items: [
  { to: 'config/turnos', label: 'Turnos', icon: Clock, show: lp.canConfigPrinters },
]
```

También eliminar el import de `Printer` ya que no se usará.

---

### 2. MyCashClosingsCard Retorna Null

**Acción:** 
- Eliminar archivo `src/components/cuenta/MyCashClosingsCard.tsx`
- Eliminar import y uso en `CuentaDashboard.tsx`

---

### 3. Roles Fantasma (cocinero/barista)

**Problema:** `AvatarType` incluye `cocinero` y `barista` que no existen en el enum de DB.

**Acción:** Actualizar `useRoleLandingV2.ts`:

```typescript
// ANTES
export type AvatarType = 
  | 'superadmin' | 'coordinador' | 'informes' | 'contador_marca'
  | 'franquiciado' | 'encargado' | 'cocinero' | 'cajero' | 'barista' | 'guest';

// DESPUÉS - Alineado con DB
export type AvatarType = 
  | 'superadmin' | 'coordinador' | 'informes' | 'contador_marca'
  | 'franquiciado' | 'encargado' | 'contador_local' | 'cajero' | 'empleado' | 'guest';
```

Y actualizar la lógica:

```typescript
// ANTES
isOperationalRole: ['cajero', 'cocinero', 'barista'].includes(avatarInfo.type)

// DESPUÉS
isOperationalRole: ['cajero', 'empleado'].includes(avatarInfo.type)
```

---

### 4. Archivo Duplicado use-toast

**Acción:** Eliminar `src/components/ui/use-toast.ts` (solo re-exporta desde hooks).

---

## IMPORTANTES - Correcciones de Calidad

### 5. Fetch Directo en FichajeEmpleado

**Problema:** Se usa `fetch()` directo a la API REST en lugar del cliente Supabase.

**Acción:** Refactorizar a usar cliente Supabase:

```typescript
// ANTES (líneas 208-229)
const regResponse = await fetch(
  `${supabaseUrl}/rest/v1/regulations?...`,
  { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
);

// DESPUÉS
const { data: regulations } = await supabase
  .from('regulations')
  .select('id, version, created_at')
  .order('version', { ascending: false })
  .limit(1);
```

---

### 6. Catch Vacío sin Logging

**Acción:** Agregar logging en el catch de `checkRegulationStatus`:

```typescript
} catch (error) {
  console.warn('Error checking regulation status:', error);
  return { hasPending: false, daysSinceUpload: 0, isBlocked: false };
}
```

---

### 7. Vista branches_public Incompleta

**Problema:** La vista no tiene `public_status` ni `public_hours`, por eso se usa la tabla directamente.

**Acción:** Actualizar la vista con una migración SQL:

```sql
CREATE OR REPLACE VIEW branches_public AS
SELECT 
  id, name, address, city, slug, phone, email,
  latitude, longitude, opening_time, closing_time,
  delivery_enabled, takeaway_enabled, dine_in_enabled,
  estimated_prep_time_min, is_active, is_open,
  local_open_state, rappi_enabled, pedidosya_enabled,
  mercadopago_delivery_enabled,
  public_status,    -- NUEVO
  public_hours      -- NUEVO
FROM branches
WHERE public_status IN ('active', 'coming_soon');
```

Luego actualizar `LocationsSection.tsx` para usar la vista.

---

### 8. NotFound.tsx en Inglés

**Acción:** Traducir al español:

```tsx
<p className="mb-4 text-xl text-muted-foreground">¡Ups! Página no encontrada</p>
<a href="/" className="text-primary underline hover:text-primary/90">
  Volver al Inicio
</a>
```

Y cambiar `console.error` a `console.warn` (menos alarmante en DevTools).

---

### 9. Campos Legacy en UserWithStats

**Acción:** Eliminar campos que siempre son 0/null/[]:

```typescript
// ELIMINAR de la interfaz
loyalty_points: number;
internal_notes: NoteEntry[];
total_orders: number;
total_spent: number;
last_order_date: string | null;
```

---

### 10. Cast `as never` en Contacto.tsx

**Problema:** El tipo de `insertData` no coincide con la tabla.

**Acción:** Crear un tipo correcto para el insert.

---

## MENORES - Mejoras de Código

### 11. Labels de Roles Inconsistentes

**Problema:** `contador_local` tiene diferentes labels según el archivo.

**Acción:** Usar siempre el map de `ROLE_LABELS` de `types.ts`:

```typescript
// Ya existe en src/components/admin/users/types.ts
export const ROLE_LABELS: Record<string, string> = {
  contador_local: 'Contador Local',
  // ...
};
```

Importar y usar este mapa en `CuentaDashboard.tsx` en lugar de tener su propio map local.

---

## Resumen de Archivos

### Eliminar (4)
```text
src/components/cuenta/MyCashClosingsCard.tsx
src/components/ui/use-toast.ts
```

### Modificar (7)
```text
src/pages/local/BranchLayout.tsx - Quitar link impresoras
src/pages/cuenta/CuentaDashboard.tsx - Quitar MyCashClosingsCard
src/hooks/useRoleLandingV2.ts - Corregir tipos de rol
src/pages/FichajeEmpleado.tsx - Usar cliente Supabase
src/pages/NotFound.tsx - Traducir al español
src/components/landing/LocationsSection.tsx - Usar vista pública
src/components/admin/users/types.ts - Limpiar campos legacy
```

### Migración SQL (1)
```text
Actualizar vista branches_public
```

---

## Orden de Ejecución

1. Eliminar archivos muertos
2. Corregir tipos de roles (useRoleLandingV2)
3. Limpiar menú de impresoras (BranchLayout)
4. Limpiar CuentaDashboard
5. Traducir NotFound
6. Migrar a cliente Supabase (FichajeEmpleado)
7. Actualizar vista SQL
8. Actualizar LocationsSection para usar vista
9. Limpiar tipos legacy (UserWithStats)
