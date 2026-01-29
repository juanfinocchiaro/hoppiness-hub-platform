

# Plan de Implementación: Sistema de Cierre de Turno Detallado

## Contexto

Este plan implementa el nuevo sistema de cierre de turno que reemplaza el sistema básico actual (`SalesEntryModal` + tabla `daily_sales` vacía). El objetivo es capturar información detallada de ventas por categoría de hamburguesas, canales de venta y formas de pago, con validación de facturación.

---

## FASE 1: Limpieza de Base de Datos

### 1.1 Eliminar Edge Function
- Eliminar `supabase/functions/auto-close-shifts/index.ts` (no se usa)

### 1.2 Migración SQL

```sql
-- Eliminar tablas antiguas
DROP TABLE IF EXISTS daily_sales CASCADE;
DROP TABLE IF EXISTS shift_closures CASCADE;

-- Crear nueva tabla de cierres
CREATE TABLE shift_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  turno TEXT NOT NULL CHECK (turno IN ('mañana', 'mediodía', 'noche', 'trasnoche')),
  
  -- JSONB para datos flexibles
  hamburguesas JSONB NOT NULL DEFAULT '{}',
  ventas_local JSONB NOT NULL DEFAULT '{}',
  ventas_apps JSONB NOT NULL DEFAULT '{}',
  
  -- Facturación
  total_facturado DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Totales calculados
  total_hamburguesas INT NOT NULL DEFAULT 0,
  total_vendido DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_efectivo DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_digital DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Validaciones
  facturacion_esperada DECIMAL(12,2) NOT NULL DEFAULT 0,
  facturacion_diferencia DECIMAL(12,2) NOT NULL DEFAULT 0,
  tiene_alerta_facturacion BOOLEAN NOT NULL DEFAULT false,
  
  -- Notas
  notas TEXT,
  
  -- Metadata
  cerrado_por UUID NOT NULL REFERENCES auth.users(id),
  cerrado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE (branch_id, fecha, turno)
);

-- Índices
CREATE INDEX idx_shift_closures_branch ON shift_closures(branch_id);
CREATE INDEX idx_shift_closures_fecha ON shift_closures(fecha);
CREATE INDEX idx_shift_closures_branch_fecha ON shift_closures(branch_id, fecha);

-- Tabla de configuración de marca
CREATE TABLE brand_closure_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('categoria_hamburguesa', 'tipo_hamburguesa', 'extra', 'app_delivery')),
  clave TEXT NOT NULL,
  etiqueta TEXT NOT NULL,
  categoria_padre TEXT,
  orden INT DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE (tipo, clave)
);

-- Tabla de configuración por local
CREATE TABLE branch_closure_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES brand_closure_config(id) ON DELETE CASCADE,
  habilitado BOOLEAN DEFAULT true,
  UNIQUE (branch_id, config_id)
);

-- Datos iniciales
INSERT INTO brand_closure_config (tipo, clave, etiqueta, orden) VALUES
  ('categoria_hamburguesa', 'clasicas', 'Clásicas', 1),
  ('categoria_hamburguesa', 'originales', 'Originales', 2),
  ('categoria_hamburguesa', 'mas_sabor', 'Más Sabor', 3),
  ('categoria_hamburguesa', 'veggies', 'Veggies', 4),
  ('categoria_hamburguesa', 'ultrasmash', 'Ultrasmash', 5);

INSERT INTO brand_closure_config (tipo, clave, etiqueta, categoria_padre, orden) VALUES
  ('tipo_hamburguesa', 'not_american', 'Not American', 'veggies', 1),
  ('tipo_hamburguesa', 'not_claudio', 'Not Claudio', 'veggies', 2),
  ('tipo_hamburguesa', 'ultra_cheese', 'Ultra Cheese', 'ultrasmash', 1),
  ('tipo_hamburguesa', 'ultra_bacon', 'Ultra Bacon', 'ultrasmash', 2);

INSERT INTO brand_closure_config (tipo, clave, etiqueta, orden) VALUES
  ('extra', 'extra_carne', 'Extra Carne c/Queso', 1),
  ('extra', 'extra_not_burger', 'Extra Not Burger', 2),
  ('extra', 'extra_not_chicken', 'Extra Not Chicken', 3);

INSERT INTO brand_closure_config (tipo, clave, etiqueta, orden) VALUES
  ('app_delivery', 'mas_delivery', 'Más Delivery', 1),
  ('app_delivery', 'rappi', 'Rappi', 2),
  ('app_delivery', 'pedidosya', 'PedidosYa', 3),
  ('app_delivery', 'mp_delivery', 'MP Delivery', 4);

-- RLS
ALTER TABLE shift_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_closure_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_closure_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shift_closures
CREATE POLICY "Users can view closures for their branches"
  ON shift_closures FOR SELECT TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Staff can insert closures"
  ON shift_closures FOR INSERT TO authenticated
  WITH CHECK (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Staff can update closures"
  ON shift_closures FOR UPDATE TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

-- Políticas para brand_closure_config
CREATE POLICY "Anyone authenticated can view config"
  ON brand_closure_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only superadmin can modify config"
  ON brand_closure_config FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()));

-- Políticas para branch_closure_config
CREATE POLICY "Users can view their branch config"
  ON branch_closure_config FOR SELECT TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

CREATE POLICY "Managers can modify branch config"
  ON branch_closure_config FOR ALL TO authenticated
  USING (has_branch_access_v2(auth.uid(), branch_id));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_shift_closures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_shift_closures_updated_at
  BEFORE UPDATE ON shift_closures
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_closures_updated_at();
```

---

## FASE 2: Tipos y Hooks

### 2.1 Crear `src/types/shiftClosure.ts`

Interfaces TypeScript para:
- `ShiftClosure` - Estructura completa del cierre
- `HamburguesasData` - Categorías y extras
- `VentasLocalData` - Salón, Takeaway, Delivery Manual
- `VentasAppsData` - Apps con sus formas de pago
- `ClosureConfig` - Configuración de marca/local

### 2.2 Crear `src/hooks/useShiftClosures.ts`

- `useTodayClosures(branchId)` - Cierres del día actual
- `useClosuresByDateRange(branchId, from, to)` - Rango de fechas
- `useBrandClosuresSummary(date)` - Resumen para Mi Marca
- `useSaveShiftClosure()` - Mutation para guardar
- `useShiftClosure(branchId, fecha, turno)` - Obtener cierre específico

### 2.3 Crear `src/hooks/useClosureConfig.ts`

- `useBrandClosureConfig()` - Configuración global
- `useBranchClosureConfig(branchId)` - Apps habilitadas por local
- `useUpdateBranchClosureConfig()` - Mutation para actualizar

### 2.4 Eliminar `src/hooks/useDailySales.ts`

---

## FASE 3: Componentes del Modal

### 3.1 Crear `src/components/local/closure/ShiftClosureModal.tsx`

Modal contenedor con:
- Selector de fecha y turno
- Secciones colapsables
- Resumen en tiempo real
- Validaciones y warnings
- Botón de guardar

### 3.2 Crear `src/components/local/closure/BurgersSection.tsx`

```text
┌────────────────────────────────────────────────────────────────┐
│ Clásicas [  ]  │  Originales [  ]  │  Más Sabor [  ]          │
├────────────────────────────────────────────────────────────────┤
│ VEGGIES                    │ ULTRASMASH                       │
│ Not American [  ]          │ Ultra Cheese [  ]                │
│ Not Claudio  [  ]          │ Ultra Bacon  [  ]                │
├────────────────────────────────────────────────────────────────┤
│ EXTRAS: ExtraCarne [  ] ExtraNotBurger [  ] ExtraNotChicken [ ]│
└────────────────────────────────────────────────────────────────┘
```

### 3.3 Crear `src/components/local/closure/LocalSalesSection.tsx`

Tabla con canales (Salón, Takeaway, Delivery Manual) y formas de pago (Efectivo, Débito, Crédito, QR, Transferencia).

### 3.4 Crear `src/components/local/closure/AppSalesSection.tsx`

- Más Delivery: Efectivo + MercadoPago
- Rappi: App
- PedidosYa: Efectivo + App
- MP Delivery: App

Solo muestra apps habilitadas para el local.

### 3.5 Crear `src/components/local/closure/InvoicingSection.tsx`

- Input de total facturado
- Cálculo automático de esperado
- Warning si diferencia > 10%

### 3.6 Crear `src/components/local/closure/ClosureSummary.tsx`

Resumen en tiempo real con totales de hamburguesas, vendido, efectivo, digital.

### 3.7 Crear `src/components/local/closure/NucleoGuideDialog.tsx`

Dialog de ayuda para explicar cómo obtener datos de Núcleo.

### 3.8 Eliminar `src/components/local/SalesEntryModal.tsx`

---

## FASE 4: Integración en Mi Local

### 4.1 Modificar `src/components/local/ManagerDashboard.tsx`

- Reemplazar `useTodaySales` por `useTodayClosures`
- Cards de turno con:
  - Estado: ✅ Cargado | ⏳ Pendiente
  - Total hamburguesas
  - Total vendido
  - Alerta de facturación si aplica
- Click en turno abre `ShiftClosureModal`
- Solo mostrar turnos habilitados del local (`branch_shifts`)

---

## FASE 5: Vista Mi Marca

### 5.1 Modificar `src/components/admin/BrandDailySalesTable.tsx`

Nueva estructura de tabla:

| Sucursal | Vendido | Efect. | Digital | Clás | Orig | +Sab | Veg | Ultra | Ext | Turnos |
|----------|---------|--------|---------|------|------|------|-----|-------|-----|--------|
| Mnt      | $250k   | $80k   | $170k   | 12   | 8    | 6    | 4   | 15    | 3   | M✅ N✅ |

- Desglose de hamburguesas por categoría
- Columna de estado de turnos dinámica (según turnos habilitados)
- Warning visual en turnos con alertas de facturación
- Click en fila para ver detalle

### 5.2 Crear `src/components/admin/ClosureDetailModal.tsx`

Modal para ver detalle completo de un cierre desde Mi Marca.

---

## FASE 6: Configuración desde Mi Marca

### 6.1 Crear `src/pages/admin/ClosureConfigPage.tsx`

- Gestión de categorías de hamburguesas
- Gestión de tipos individuales
- Gestión de extras
- Gestión de apps de delivery
- Preview del formulario resultante

### 6.2 Modificar `src/components/admin/AdminSidebar.tsx`

Agregar enlace en sección Configuración:
- Reglamentos (ya existe)
- **Cierre de Turno** (nuevo)

### 6.3 Modificar `src/App.tsx`

Agregar ruta: `/mimarca/configuracion/cierres`

---

## Estructura de Archivos Final

### Crear:
```
src/types/shiftClosure.ts
src/hooks/useShiftClosures.ts
src/hooks/useClosureConfig.ts
src/components/local/closure/ShiftClosureModal.tsx
src/components/local/closure/BurgersSection.tsx
src/components/local/closure/LocalSalesSection.tsx
src/components/local/closure/AppSalesSection.tsx
src/components/local/closure/InvoicingSection.tsx
src/components/local/closure/ClosureSummary.tsx
src/components/local/closure/NucleoGuideDialog.tsx
src/components/admin/ClosureDetailModal.tsx
src/pages/admin/ClosureConfigPage.tsx
```

### Eliminar:
```
supabase/functions/auto-close-shifts/index.ts
src/components/local/SalesEntryModal.tsx
src/hooks/useDailySales.ts
```

### Modificar:
```
src/components/local/ManagerDashboard.tsx
src/components/admin/BrandDailySalesTable.tsx
src/components/admin/AdminSidebar.tsx
src/App.tsx
```

---

## Lógica de Negocio

### Cálculo de Facturación Esperada
```
Efectivo Local = Salón.efectivo + Takeaway.efectivo + DeliveryManual.efectivo + PedidosYa.efectivo
Efectivo MásDelivery = MásDelivery.efectivo

Esperado = Total Vendido - Efectivo Local + Efectivo MásDelivery
```

### Validaciones
- **Total $0:** Warning "¿Seguro que no hubo ventas?" pero permitir guardar
- **Facturación:** Warning si `|facturado - esperado| > 10%`
- **Usuario:** Siempre guardar `cerrado_por`

---

## Orden de Implementación

1. Migración SQL (crear tablas, RLS, datos iniciales)
2. Eliminar edge function `auto-close-shifts`
3. Crear tipos TypeScript
4. Crear hooks
5. Crear componentes del modal
6. Integrar en ManagerDashboard
7. Actualizar BrandDailySalesTable
8. Crear página de configuración
9. Eliminar archivos legacy
10. Testing

