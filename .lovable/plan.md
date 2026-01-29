
# Plan: Sistema de Cierre de Turno con Comparaciones y Manual Integrado

## Resumen

Rediseño completo del formulario de cierre de turno para incluir:
1. Comparación de ventas de Núcleo vs fuentes externas (Posnet y Paneles de Apps)
2. Registro de diferencia de caja
3. Manual de uso integrado con ayuda contextual en cada sección

---

## Diseño Visual del Formulario

### Estructura General (7 secciones)

```text
┌────────────────────────────────────────────────────────────┐
│ CIERRE DE TURNO - [Sucursal] - [Fecha] [Turno]             │
├────────────────────────────────────────────────────────────┤
│ 1. HAMBURGUESAS VENDIDAS                          Total: X │
│ 2. VENTAS MOSTRADOR (Núcleo)                   Subtotal: $ │
│ 3. COMPARACIÓN CON POSNET                    ✅/⚠️ Dif: $ │
│ 4. VENTAS POR APPS (Núcleo)                    Subtotal: $ │
│ 5. COMPARACIÓN CON PANELES                   ✅/⚠️ Dif: $ │
│ 6. ARQUEO DE CAJA                            ✅/⚠️ Dif: $ │
│ 7. FACTURACIÓN                               ✅/⚠️ Dif: $ │
│ 8. NOTAS DEL TURNO                                         │
├────────────────────────────────────────────────────────────┤
│ RESUMEN: Hamburguesas | Vendido | Efectivo | Digital       │
│ ALERTAS: ⚠️ Diferencia Posnet | ⚠️ Diferencia Apps | etc   │
└────────────────────────────────────────────────────────────┘
```

### Sección 3: Comparación con Posnet (NUEVO)

```text
┌────────────────────────────────────────────────────────────┐
│ 📟 COMPARACIÓN CON POSNET                                  │
│ ───────────────────────────────────────────────────────────│
│ [?] ¿Cómo obtener el cierre del Posnet?                    │
│ ───────────────────────────────────────────────────────────│
│                                                            │
│                      Núcleo          Posnet      Diferencia│
│ ┌─────────────────┬───────────────┬───────────┬───────────┐│
│ │ Total Tarjetas  │  $23.500      │ [$_____ ] │ ✅ $0     ││
│ │ (Déb+Créd+QR)   │  (calculado)  │           │           ││
│ └─────────────────┴───────────────┴───────────┴───────────┘│
│                                                            │
│ Desglose Núcleo:                                           │
│   Débito: $8.000 | Crédito: $12.000 | QR: $3.500           │
│                                                            │
│ ⚠️ Si hay diferencia: puede ser un error de carga en      │
│    Núcleo o una venta que no se procesó correctamente.     │
└────────────────────────────────────────────────────────────┘
```

### Sección 4-5: Ventas por Apps con Comparación (REDISEÑO)

```text
┌────────────────────────────────────────────────────────────┐
│ 📱 VENTAS POR APPS                                         │
│ ───────────────────────────────────────────────────────────│
│ [?] ¿Cómo verificar con cada app?                          │
│ ───────────────────────────────────────────────────────────│
│                                                            │
│ ┌─── MÁS DELIVERY ─────────────────────────────────────────┐
│ │ Datos de Núcleo:                                         │
│ │   Efectivo: [$2.000]  MercadoPago: [$8.000]              │
│ │                                     Suma: $10.000        │
│ │ ─────────────────────────────────────────────────────────│
│ │ Total del Panel MásDeli: [$10.200]                       │
│ │ Diferencia: ⚠️ -$200 (Núcleo tiene $200 menos)           │
│ └──────────────────────────────────────────────────────────┘
│                                                            │
│ ┌─── RAPPI ────────────────────────────────────────────────┐
│ │ Datos de Núcleo (forma de pago "Vales"):                 │
│ │   Vales: [$7.000]                     Suma: $7.000       │
│ │ ─────────────────────────────────────────────────────────│
│ │ Total del Panel Rappi: [$7.000]                          │
│ │ Diferencia: ✅ $0                                        │
│ └──────────────────────────────────────────────────────────┘
│                                                            │
│ ┌─── PEDIDOSYA ────────────────────────────────────────────┐
│ │ Datos de Núcleo:                                         │
│ │   Efectivo: [$1.500]  Vales (app): [$4.000]              │
│ │                                     Suma: $5.500         │
│ │ ─────────────────────────────────────────────────────────│
│ │ Total del Panel PeYa: [$5.800]                           │
│ │ Diferencia: ⚠️ -$300 (Núcleo tiene $300 menos)           │
│ └──────────────────────────────────────────────────────────┘
│                                                            │
│ ┌─── MP DELIVERY ──────────────────────────────────────────┐
│ │ Datos de Núcleo (forma de pago "Vales"):                 │
│ │   Vales: [$3.000]                     Suma: $3.000       │
│ │ ─────────────────────────────────────────────────────────│
│ │ Total del Panel MP: [$3.000]                             │
│ │ Diferencia: ✅ $0                                        │
│ └──────────────────────────────────────────────────────────┘
│                                                            │
│ ═══════════════════════════════════════════════════════════│
│ RESUMEN DIFERENCIAS APPS:                                  │
│ Total Núcleo: $25.500 | Total Paneles: $26.000             │
│ ⚠️ Diferencia Total: -$500                                 │
│ Las apps reportan $500 más de lo que está en Núcleo        │
└────────────────────────────────────────────────────────────┘
```

### Sección 6: Arqueo de Caja (NUEVO)

```text
┌────────────────────────────────────────────────────────────┐
│ 💵 ARQUEO DE CAJA                                          │
│ ───────────────────────────────────────────────────────────│
│ [?] ¿Cómo obtener la diferencia de caja?                   │
│ ───────────────────────────────────────────────────────────│
│                                                            │
│ Ingresá la diferencia de caja que te da Núcleo:            │
│                                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Diferencia de caja: [$ _________ ]                      ││
│ │                                                         ││
│ │ Si la caja cerró EXACTA, dejá en $0                     ││
│ │ Si FALTA dinero, poné el monto en NEGATIVO (ej: -500)   ││
│ │ Si SOBRA dinero, poné el monto en POSITIVO (ej: +200)   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                            │
│ ✅ Caja exacta                                             │
│ ⚠️ Diferencia de $500 - Se registrará para seguimiento     │
└────────────────────────────────────────────────────────────┘
```

---

## Cambios en la Estructura de Datos

### Archivo: `src/types/shiftClosure.ts`

**Nuevas interfaces:**

```typescript
// Comparación con Posnet
export interface ComparacionPosnet {
  total_posnet: number;  // Total único del cierre del posnet (tarjetas)
}

// Comparación con Panel de cada App
export interface ComparacionApp {
  total_panel: number;   // Total que reporta el panel de la app
}

// Actualizar VentasLocalData
export interface VentasLocalData {
  salon: ChannelPayments;
  takeaway: ChannelPayments;
  delivery_manual: ChannelPayments;
  comparacion_posnet: ComparacionPosnet;  // NUEVO
}

// Renombrar campos en VentasAppsData para claridad
export interface VentasAppsData {
  mas_delivery: {
    efectivo: number;      // Forma de pago "Efectivo" en Núcleo
    mercadopago: number;   // Forma de pago "MercadoPago" en Núcleo  
    total_panel: number;   // NUEVO: Total del panel MásDeli
  };
  rappi: {
    vales: number;         // Forma de pago "Vales" en Núcleo (antes era "app")
    total_panel: number;   // NUEVO: Total del panel Rappi
  };
  pedidosya: {
    efectivo: number;      // Forma de pago "Efectivo" en Núcleo
    vales: number;         // Forma de pago "Vales" en Núcleo (antes era "app")
    total_panel: number;   // NUEVO: Total del panel PeYa
  };
  mp_delivery: {
    vales: number;         // Forma de pago "Vales" en Núcleo (antes era "app")
    total_panel: number;   // NUEVO: Total del panel MP Delivery
  };
}

// Arqueo de caja
export interface ArqueoCaja {
  diferencia_caja: number;  // Diferencia que reporta Núcleo (puede ser negativo)
}

// Agregar al ShiftClosure principal
export interface ShiftClosure {
  // ... campos existentes ...
  arqueo_caja: ArqueoCaja;
  
  // Diferencias calculadas (para persistir y reportes)
  diferencia_posnet: number;
  diferencia_apps: number;
  tiene_alerta_posnet: boolean;
  tiene_alerta_apps: boolean;
  tiene_alerta_caja: boolean;
}
```

**Nuevas funciones helper:**

```typescript
// Calcular total de tarjetas en Núcleo (para comparar con Posnet)
export function calcularTotalTarjetasNucleo(ventasLocal: VentasLocalData): number {
  const canales = [ventasLocal.salon, ventasLocal.takeaway, ventasLocal.delivery_manual];
  return canales.reduce((sum, canal) => 
    sum + canal.debito + canal.credito + canal.qr, 0
  );
}

// Calcular diferencia con Posnet
export function calcularDiferenciaPosnet(ventasLocal: VentasLocalData): {
  nucleo: number;
  posnet: number;
  diferencia: number;
  tieneAlerta: boolean;
} {
  const nucleo = calcularTotalTarjetasNucleo(ventasLocal);
  const posnet = ventasLocal.comparacion_posnet?.total_posnet || 0;
  const diferencia = nucleo - posnet;
  return {
    nucleo,
    posnet,
    diferencia,
    tieneAlerta: diferencia !== 0,
  };
}

// Calcular diferencias por App
export function calcularDiferenciasApps(ventasApps: VentasAppsData): {
  porApp: {
    mas_delivery: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
    rappi: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
    pedidosya: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
    mp_delivery: { nucleo: number; panel: number; diferencia: number; tieneAlerta: boolean };
  };
  totalNucleo: number;
  totalPaneles: number;
  diferencia: number;
  tieneAlerta: boolean;
}

// Defaults actualizados
export function getDefaultVentasLocal(): VentasLocalData {
  return {
    salon: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    takeaway: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    delivery_manual: { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0 },
    comparacion_posnet: { total_posnet: 0 },
  };
}

export function getDefaultVentasApps(): VentasAppsData {
  return {
    mas_delivery: { efectivo: 0, mercadopago: 0, total_panel: 0 },
    rappi: { vales: 0, total_panel: 0 },
    pedidosya: { efectivo: 0, vales: 0, total_panel: 0 },
    mp_delivery: { vales: 0, total_panel: 0 },
  };
}

export function getDefaultArqueoCaja(): ArqueoCaja {
  return { diferencia_caja: 0 };
}
```

---

## Componentes a Crear/Modificar

### Nuevo: `src/components/local/closure/PosnetComparisonSection.tsx`

Componente para la comparación Núcleo vs Posnet.

### Nuevo: `src/components/local/closure/CashCountSection.tsx`

Componente para el arqueo de caja (diferencia).

### Nuevo: `src/components/local/closure/ClosureHelpManual.tsx`

Modal con el manual completo de cómo cargar el cierre.

### Modificar: `LocalSalesSection.tsx`

- Mantener la grilla actual de canales x formas de pago
- Agregar un chip que muestre el "Total Tarjetas" calculado

### Modificar: `AppSalesSection.tsx`

- Cambiar el campo `app` por `vales` en Rappi, PeYa y MP Delivery
- Agregar input de "Total del Panel" para cada app
- Mostrar diferencia calculada en tiempo real
- Agregar resumen de diferencias al final

### Modificar: `ClosureSummary.tsx`

- Agregar sección de "Alertas Detectadas"
- Mostrar diferencias de Posnet, Apps y Caja si existen

### Modificar: `ShiftClosureModal.tsx`

- Agregar estados para `comparacionPosnet` y `arqueoCaja`
- Incluir nuevas secciones en el formulario
- Actualizar cálculos de alertas

### Modificar: `useShiftClosures.ts`

- Actualizar `useSaveShiftClosure` para persistir nuevos campos
- Agregar cálculos de diferencias en el guardado

---

## Manual de Uso Integrado (Contenido)

### Modal: "¿Cómo cargar el cierre de turno?"

**Paso 1: Obtener datos de Núcleo**
1. Ingresá a Núcleo con tu usuario
2. Andá a Reportes > Ventas del día
3. Filtrá por la fecha y turno que estás cerrando
4. Anotá los montos separados por forma de pago

**Paso 2: Cargar Ventas de Mostrador**
- Separá las ventas por canal: Salón, Takeaway, Delivery Manual
- Para cada canal, ingresá el monto de cada forma de pago
- Si un local no está integrado con las apps, los pedidos manuales van en "Delivery Manual"

**Paso 3: Comparar con el Posnet**
- Hacé el cierre del Posnet (terminal de tarjetas)
- Ingresá el total que da el Posnet
- El sistema calculará si hay diferencia con lo de Núcleo

**Paso 4: Cargar Ventas de Apps**

| App | Integrada | No Integrada |
|-----|-----------|--------------|
| MásDelivery | Se carga automático en Núcleo | Cargar manualmente con canal "MásDelivery" |
| Rappi | Núcleo muestra "Rappi" | Usar forma de pago "Vales" |
| PedidosYa | Núcleo muestra "PedidosYa" | Usar forma de pago "Vales" + "Efectivo" |
| MP Delivery | Núcleo muestra "MP Delivery" | Usar forma de pago "Vales" |

**Paso 5: Comparar con Paneles de Apps**
- Entrá al panel de cada app y anotá el total de ventas del turno
- MásDelivery: App de restaurante > Historial
- Rappi: Partners Portal > Historial de pedidos
- PedidosYa: App restaurante > Pedidos entregados
- MP Delivery: MercadoPago > Actividad > Filtrar delivery

**Paso 6: Cargar Arqueo de Caja**
- En Núcleo, hacé el cierre de caja
- Si te da diferencia, ingresá el monto (negativo si falta, positivo si sobra)
- Si cierra exacto, dejá $0

**Paso 7: Cargar Facturación**
- Ingresá el total facturado del turno
- El sistema valida contra lo esperado

**Paso 8: Revisar y Guardar**
- Verificá que no haya alertas rojas
- Si hay diferencias, revisá los datos antes de guardar
- Agregá notas si hubo algún incidente

---

## Indicadores Visuales

| Estado | Color | Icono | Significado |
|--------|-------|-------|-------------|
| Sin diferencia | Verde | ✅ | Todo coincide |
| Diferencia detectada | Rojo | ⚠️ | Hay diferencia, revisar |
| Sin datos externos | Gris | - | No se cargó el dato de comparación |

**Política**: Cualquier diferencia distinta de $0 genera alerta (no hay tolerancia).

---

## Migración de Base de Datos

Se requiere agregar columnas a la tabla `shift_closures`:

```sql
ALTER TABLE shift_closures
ADD COLUMN IF NOT EXISTS arqueo_caja JSONB DEFAULT '{"diferencia_caja": 0}'::jsonb,
ADD COLUMN IF NOT EXISTS diferencia_posnet DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS diferencia_apps DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tiene_alerta_posnet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tiene_alerta_apps BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tiene_alerta_caja BOOLEAN DEFAULT false;
```

Los campos JSONB existentes (`ventas_local`, `ventas_apps`) se actualizarán automáticamente con la nueva estructura ya que PostgreSQL permite agregar campos a JSONB sin migración.

---

## Orden de Implementación

1. Migración de base de datos (agregar columnas)
2. Actualizar `src/types/shiftClosure.ts` con nuevas interfaces y funciones
3. Crear `PosnetComparisonSection.tsx`
4. Crear `CashCountSection.tsx`
5. Crear `ClosureHelpManual.tsx`
6. Modificar `LocalSalesSection.tsx` (agregar chip de total tarjetas)
7. Modificar `AppSalesSection.tsx` (rediseño completo)
8. Modificar `ClosureSummary.tsx` (agregar alertas)
9. Modificar `ShiftClosureModal.tsx` (integrar todo)
10. Modificar `useShiftClosures.ts` (persistencia y cálculos)
11. Testing del flujo completo

---

## Compatibilidad Hacia Atrás

Los registros existentes seguirán funcionando porque:
- Los nuevos campos JSONB tienen valores por defecto
- Las funciones de cálculo manejan valores `undefined` o `null`
- Los campos de comparación son opcionales (si no se cargan, no generan alerta)
