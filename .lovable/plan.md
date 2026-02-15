
## Analisis de Observaciones del Equipo - Supervisiones y Fichaje

Se identificaron 5 observaciones. Analizo cada una con diagnostico y solucion propuesta.

---

### Observacion 1: Personal no aparece en las planillas de Carlos Paz

**Diagnostico:** Los datos existen en la base de datos (1 encargado + 7 empleados para VCP). La query del componente `InspectionStaffChecklist` es correcta y las politicas de seguridad permiten lectura para coordinadores. 

El problema mas probable es que la pestaña "Personal" funciona correctamente para AGREGAR staff, pero el equipo esperaba que el personal **apareciera automaticamente** cargado, no que tuvieran que agregarlo manualmente uno por uno. Actualmente el flujo requiere seleccionar cada empleado del dropdown y agregarlo.

**Solucion:** Agregar un boton "Cargar todo el equipo" que inserte automaticamente a todos los empleados activos de la sucursal en la lista de presentes, para que luego el inspector solo elimine a quienes no estan. Esto invierte la logica: en vez de "agregar presentes", se "quitan ausentes".

**Archivos a modificar:**
- `src/components/inspections/InspectionStaffChecklist.tsx` - Agregar boton "Cargar todos" que inserte masivamente

---

### Observacion 2: No se pueden ver fotos en hallazgos de planillas cerradas

**Diagnostico:** Confirmado. En `InspectionSummary.tsx` (lineas 178-189), la seccion "Hallazgos" muestra el nombre del item y las observaciones, pero **no renderiza `photo_url`**. Las fotos se guardan correctamente pero no se muestran en el resumen de visitas completadas.

**Solucion:** Agregar un enlace o miniatura clicable para cada hallazgo que tenga foto.

**Archivos a modificar:**
- `src/components/inspections/InspectionSummary.tsx` - Agregar renderizado de `item.photo_url` en la seccion de hallazgos (y en todos los items si tienen foto)

---

### Observacion 3: Solo permite una foto por hallazgo (la nueva reemplaza la anterior)

**Diagnostico:** Confirmado. El campo `photo_url` en `inspection_items` es un TEXT simple (una sola URL). Cada subida de foto sobreescribe la anterior en la linea 63 de `InspectionItemRow.tsx`.

**Solucion:** Migrar `photo_url` (TEXT) a `photo_urls` (TEXT[] - array de URLs). Modificar la logica de subida para agregar al array en vez de reemplazar. Mostrar todas las fotos con opcion de eliminar individual.

**Archivos a modificar:**
- **Migracion SQL:** Renombrar columna `photo_url` a `photo_urls` como TEXT[]
- `src/types/inspection.ts` - Actualizar tipo `InspectionItem`
- `src/hooks/useInspections.ts` - Actualizar mutaciones de upload y update
- `src/components/inspections/InspectionItemRow.tsx` - Mostrar galeria de fotos, agregar sin reemplazar
- `src/components/inspections/InspectionSummary.tsx` - Mostrar multiples fotos

---

### Observacion 4: Encargados necesitan acceso a supervisiones de su sucursal

**Diagnostico:** Confirmado. Las supervisiones solo estan en `/mimarca/supervisiones` (panel de marca). El sidebar de Mi Local (`LocalSidebar.tsx`) no tiene enlace a supervisiones. Las politicas RLS para `branch_inspections` ya permiten lectura a encargados/franquiciados, pero la interfaz no existe.

Sin embargo, la politica RLS usa la tabla legacy `user_roles_v2` (con `ur.local_role` y `ur.branch_ids`) en vez de `user_branch_roles`. Esto puede bloquear a usuarios que solo tienen datos en la nueva tabla.

**Solucion:**
1. Crear una ruta `/milocal/:branchId/supervisiones` con una pagina que muestre las supervisiones filtradas por esa sucursal (solo lectura)
2. Agregar enlace en `LocalSidebar.tsx`
3. Corregir las politicas RLS de `branch_inspections` e `inspection_items` para usar `user_branch_roles` en vez de `user_roles_v2`

**Archivos a crear:**
- `src/pages/local/InspectionsLocalPage.tsx` - Pagina de supervisiones del local (solo lectura)

**Archivos a modificar:**
- `src/components/layout/LocalSidebar.tsx` - Agregar enlace "Supervisiones" para encargados/franquiciados
- `src/App.tsx` - Agregar ruta
- **Migracion SQL:** Actualizar RLS de `branch_inspections` e `inspection_items` para usar `user_branch_roles`

---

### Observacion 5: GPS muestra 777m en fichaje de Villa Carlos Paz

**Diagnostico:** La ubicacion configurada para Villa Carlos Paz es lat: -31.4241, lng: -64.4978. Villa Carlos Paz es una ciudad, asi que estas coordenadas podrian ser del centro de la ciudad y no del local real. La distancia de 777m sugiere que las coordenadas almacenadas no corresponden a la ubicacion exacta del restaurante.

Esto no es un bug del codigo, sino un problema de datos: las coordenadas del local necesitan actualizarse.

**Solucion:** Actualizar las coordenadas de la sucursal Villa Carlos Paz en la base de datos con la ubicacion exacta del restaurante. Se necesita que alguien proporcione la direccion exacta o las coordenadas GPS correctas.

Para verificar, necesito que confirmes la direccion fisica del local de Villa Carlos Paz, y yo actualizo las coordenadas.

---

### Resumen de prioridades

| # | Observacion | Dificultad | Impacto |
|---|-------------|-----------|---------|
| 1 | Cargar personal automaticamente | Baja | Media |
| 2 | Mostrar fotos en hallazgos cerrados | Baja | Alta |
| 3 | Multiples fotos por hallazgo | Media | Media |
| 4 | Acceso encargados a supervisiones | Media | Alta |
| 5 | GPS Villa Carlos Paz | Solo datos | Alta |

### Detalles tecnicos de la migracion SQL

```sql
-- Observacion 3: Migrar photo_url a photo_urls array
ALTER TABLE inspection_items 
  ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

UPDATE inspection_items 
  SET photo_urls = ARRAY[photo_url] 
  WHERE photo_url IS NOT NULL;

ALTER TABLE inspection_items DROP COLUMN photo_url;

-- Observacion 4: Corregir RLS de branch_inspections
DROP POLICY IF EXISTS branch_inspections_local_view ON branch_inspections;
CREATE POLICY branch_inspections_local_view ON branch_inspections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND ubr.local_role IN ('franquiciado', 'encargado')
      AND ubr.branch_id = branch_inspections.branch_id
    )
  );

-- Similar para inspection_items
DROP POLICY IF EXISTS inspection_items_local_view ON inspection_items;
CREATE POLICY inspection_items_local_view ON inspection_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM branch_inspections bi
      JOIN user_branch_roles ubr ON ubr.branch_id = bi.branch_id
      WHERE bi.id = inspection_items.inspection_id
      AND ubr.user_id = auth.uid()
      AND ubr.is_active = true
      AND ubr.local_role IN ('franquiciado', 'encargado')
    )
  );
```
