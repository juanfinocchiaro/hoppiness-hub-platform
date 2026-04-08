

## Fix: Columnas inexistentes `tiempo_estimado_retiro_min` / `tiempo_estimado_delivery_min`

### Diagnóstico

La tabla `webapp_config` tiene las columnas en inglés (`estimated_pickup_time_min`, `estimated_delivery_time_min`), pero el código las referencia con los nombres viejos en español. Esto causa el error del schema cache al guardar cambios en la configuración de la tienda online.

### Cambios

**1. `src/pages/local/WebappConfigPage.tsx`** (líneas 102-103)
- `tiempo_estimado_retiro_min` → `estimated_pickup_time_min`
- `tiempo_estimado_delivery_min` → `estimated_delivery_time_min`

**2. `src/services/publicBranchService.ts`** (línea 57)
- Corregir el select: `tiempo_estimado_retiro_min` → `estimated_pickup_time_min`, `tiempo_estimado_delivery_min` → `estimated_delivery_time_min`, `estado` → `status`

**3. `src/pages/Pedir.tsx`** (líneas 104-105)
- Actualizar el mapeo para usar los nombres correctos devueltos por la query corregida

**4. `supabase/functions/create-webapp-order/index.ts`** (línea 296-298)
- Corregir las referencias a `config.tiempo_estimado_delivery_min` → `config.estimated_delivery_time_min` y `config.tiempo_estimado_retiro_min` → `config.estimated_pickup_time_min`

**5. `src/hooks/useWebappMenu.ts` / `src/services/menuService.ts`**
- Verificar si `fetchWebappConfig` mapea las columnas correctamente al tipo `WebappConfig` y corregir si es necesario

**6. `src/types/webapp.ts`** (líneas 27-28)
- Renombrar los campos del tipo `WebappConfig` a los nombres ingleses, o mantener los españoles y asegurar el mapeo en el fetch

### Resultado
Se elimina el error de schema cache y la configuración de la tienda online se guarda correctamente.

