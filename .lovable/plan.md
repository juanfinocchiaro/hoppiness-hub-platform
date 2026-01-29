
# Plan de Limpieza Integral + Correcciones

## Resumen Ejecutivo
Este plan aborda:
1. **Bug Android "Pedir"**: usar `window.open()` para compatibilidad cross-browser
2. **20+ archivos a eliminar**: código huérfano y legacy sin uso
3. **Permisos legacy**: eliminar ~20 permisos siempre-false de usePermissionsV2
4. **Corrección Equipo Ahora**: usar `clock_entries` en lugar de `attendance_records`
5. **Acceso Cajero**: dashboard limitado para cargar cierres
6. **Sucursales dinámicas**: traer de BD en lugar de hardcoded
7. **Unificar URL MasDelivery**: a `pedidos.masdelivery.com/hoppiness`
8. **Eliminar links legales**: quitar `/terminos` y `/privacidad` del footer

---

## Fase 1: Bug Android + Unificación URLs

### 1.1 Corregir botón "Pedir" para Android
Cambiar todos los links a MasDelivery para usar `window.open()`:

**Archivos a modificar:**
- `src/components/layout/PublicHeader.tsx`
- `src/components/layout/PublicFooter.tsx`
- `src/pages/Nosotros.tsx`
- `src/pages/Index.tsx`

**Cambio:**
```tsx
// ANTES
<a href="https://..." target="_blank">Pedir</a>

// DESPUÉS
<button onClick={() => window.open('https://pedidos.masdelivery.com/hoppiness', '_blank')}>
  Pedir
</button>
```

### 1.2 Unificar URL MasDelivery
Cambiar todas las referencias a la URL correcta: `https://pedidos.masdelivery.com/hoppiness`

**Archivo con URL incorrecta:**
- `src/pages/Nosotros.tsx` (usa `hoppinessclub.masdelivery.com.ar`)

---

## Fase 2: Eliminar Links Legales Inexistentes

**Archivo:** `src/components/layout/PublicFooter.tsx`

Eliminar las líneas:
```tsx
<Link to="/terminos">Términos y condiciones</Link>
<Link to="/privacidad">Política de privacidad</Link>
```

---

## Fase 3: Sucursales Dinámicas en Landing

**Archivo:** `src/components/landing/LocationsSection.tsx`

Cambiar de datos hardcoded a query de la tabla `branches`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function LocationsSection() {
  const { data: branches } = useQuery({
    queryKey: ['public-branches'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches_public')
        .select('name, address, city, hours, maps_url, is_active')
        .eq('is_active', true)
        .order('name');
      return data;
    },
  });
  // ...render dinámico
}
```

---

## Fase 4: Corrección "Equipo Ahora" en ManagerDashboard

**Archivo:** `src/components/local/ManagerDashboard.tsx`

El hook `useCurrentlyWorking` usa `attendance_records` (vacía). Cambiar a `clock_entries`:

```tsx
// ANTES: attendance_records con check_in/check_out
// DESPUÉS: clock_entries con entry_type='entrada' sin salida posterior

function useCurrentlyWorking(branchId: string) {
  return useQuery({
    queryKey: ['currently-working', branchId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Obtener todas las entradas/salidas de hoy
      const { data: entries } = await supabase
        .from('clock_entries')
        .select('user_id, entry_type, created_at')
        .eq('branch_id', branchId)
        .gte('created_at', today)
        .order('created_at', { ascending: true });

      // Calcular quién está fichado (última acción = entrada)
      const userStatus = new Map();
      entries?.forEach(e => {
        userStatus.set(e.user_id, {
          type: e.entry_type,
          time: e.created_at
        });
      });

      const workingUserIds = [...userStatus.entries()]
        .filter(([_, v]) => v.type === 'entrada')
        .map(([k, v]) => ({ user_id: k, clock_in: v.time }));

      if (!workingUserIds.length) return [];

      // Obtener perfiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', workingUserIds.map(u => u.user_id));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return workingUserIds.map(w => ({
        user_id: w.user_id,
        check_in: w.clock_in,
        profile: profileMap.get(w.user_id),
        minutesWorking: differenceInMinutes(new Date(), new Date(w.clock_in)),
      }));
    },
    refetchInterval: 60000,
  });
}
```

---

## Fase 5: Acceso Cajero al Dashboard (Limitado)

### 5.1 Modificar permisos
**Archivo:** `src/hooks/usePermissionsV2.ts`

```tsx
// Línea ~347
canViewDashboard: hasCurrentBranchAccess && (isEncargado || isFranquiciado || isCajero),
canEnterSales: hasCurrentBranchAccess && (isEncargado || isFranquiciado || isCajero),
```

### 5.2 Modificar BranchLayout para permitir cajeros
**Archivo:** `src/pages/local/BranchLayout.tsx`

Actualmente redirige cajeros a `/cuenta`. Cambiar para que puedan ver el dashboard.

### 5.3 Dashboard limitado para cajeros
**Archivo:** `src/components/local/ManagerDashboard.tsx`

Agregar lógica condicional:
```tsx
const { isCajero } = usePermissionsV2(branchId);

// Solo mostrar sección "Ventas Hoy" si es cajero
// Ocultar "Equipo Ahora" y "Pendientes" para cajeros
```

---

## Fase 6: Eliminar Permisos Legacy de usePermissionsV2

**Archivo:** `src/hooks/usePermissionsV2.ts`

Eliminar los siguientes permisos que siempre son `false`:

**Interface (tipos):**
```tsx
// ELIMINAR de la interface PermissionsV2.local:
canViewCierreTurno, canViewIntegrador, canManageOrders, canOperatePOS, 
canViewKDS, canViewPedidosActivos, canViewHistorial, canCancelOrder, 
canApplyDiscount, canToggleProductAvailability, canViewCajaVenta, 
canOpenCloseCaja, canDoAlivio, canViewCajaAlivio, canViewCajaResguardo, 
canOperateCajaResguardo, canViewCuentaCorriente, canViewMenu, 
canToggleAvailability, canViewFinanceMovements, canViewInvoices, 
canViewObligaciones, canConfigDeliveryZones, canConfigIntegrations, canConfigKDS
```

**Implementación (localPermissions):**
Eliminar las mismas propiedades del objeto `localPermissions`.

---

## Fase 7: Archivos a Eliminar

### 7.1 Páginas huérfanas
| Archivo | Razón |
|---------|-------|
| `src/pages/ClockIn.tsx` | Usa edge function legacy que escribe a attendance_records |
| `src/pages/FichajePublic.tsx` | No está en rutas de App.tsx |
| `src/pages/local/AttendanceKiosk.tsx` | No está en rutas, QR dinámico no usado |

### 7.2 Componentes huérfanos
| Archivo | Razón |
|---------|-------|
| `src/components/cash/SupervisorPinDialog.tsx` | No importado en ningún lado |
| `src/components/hr/EmployeeDetailManager.tsx` | No importado en ningún lado |

### 7.3 Carpetas vacías resultantes
| Carpeta | Acción |
|---------|--------|
| `src/components/cash/` | Eliminar si queda vacía |

### 7.4 Tipos no usados
| Archivo | Razón |
|---------|-------|
| `src/types/channels.ts` | Nunca se importa |

### 7.5 Rutas a quitar de App.tsx
```tsx
// ELIMINAR:
<Route path="/clock-in" element={<ClockIn />} />
```

---

## Fase 8: Documentar para Eliminación Futura

Crear archivo `docs/LEGACY_ELIMINATION_QUEUE.md`:

### Edge Functions a eliminar
| Función | Razón |
|---------|-------|
| `attendance-token` | Escribe a attendance_records (legacy) |
| `create-web-order` | POS/WebApp no implementados |
| `webhook-orders` | POS/WebApp no implementados |
| `order-tracking` | POS/WebApp no implementados |
| `generate-invoice` | Facturación automática no implementada |
| `facturante-invoice` | Facturación automática no implementada |
| `generate-pos-thumbnail` | POS no implementado |
| `process-invoice` | No usado en código |

### Tablas a eliminar
| Grupo | Tablas |
|-------|--------|
| KDS | `kds_settings`, `kds_stations`, `kds_tokens` |
| Productos | `products`, `product_categories`, `modifier_groups`, `modifier_options`, `product_*` |
| Cash Registers | `cash_registers`, `cash_register_movements`, `cash_register_shifts` |
| Attendance Legacy | `attendance_records`, `attendance_tokens`, `attendance_logs` |
| POS/Orders | `orders`, `order_items`, `order_*` |
| Printers | `printers` |

### Imágenes a eliminar
- Carpeta `public/images/products/` (39 productos)
- Carpeta `public/images/modifiers/`

---

## Orden de Ejecución

1. **Fase 1**: Bug Android + URLs (bajo riesgo)
2. **Fase 2**: Links legales (bajo riesgo)
3. **Fase 3**: Sucursales dinámicas (medio riesgo - nueva query)
4. **Fase 4**: Corrección Equipo Ahora (medio riesgo - lógica de fichaje)
5. **Fase 5**: Acceso Cajero (medio riesgo - permisos)
6. **Fase 6**: Eliminar permisos legacy (bajo riesgo)
7. **Fase 7**: Eliminar archivos (bajo riesgo)
8. **Fase 8**: Documentación (sin riesgo)

---

## Archivos Modificados (Resumen)

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/PublicHeader.tsx` | window.open para Pedir |
| `src/components/layout/PublicFooter.tsx` | window.open + eliminar links legales |
| `src/pages/Nosotros.tsx` | Corregir URL MasDelivery |
| `src/pages/Index.tsx` | window.open para Pedir |
| `src/components/landing/LocationsSection.tsx` | Query dinámica de branches |
| `src/components/local/ManagerDashboard.tsx` | clock_entries + vista cajero |
| `src/hooks/usePermissionsV2.ts` | Permisos cajero + eliminar legacy |
| `src/pages/local/BranchLayout.tsx` | Permitir cajeros en dashboard |
| `src/App.tsx` | Eliminar ruta /clock-in |

## Archivos Eliminados (7)

1. `src/pages/ClockIn.tsx`
2. `src/pages/FichajePublic.tsx`
3. `src/pages/local/AttendanceKiosk.tsx`
4. `src/components/cash/SupervisorPinDialog.tsx`
5. `src/components/hr/EmployeeDetailManager.tsx`
6. `src/types/channels.ts`
7. `src/components/cash/` (carpeta)

## Documentación Creada (1)

- `docs/LEGACY_ELIMINATION_QUEUE.md`
