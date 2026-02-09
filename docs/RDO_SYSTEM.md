# Sistema RDO (Resultado de Operaciones)

## Resumen

El sistema RDO unifica la categorización de todos los costos del negocio para generar automáticamente el Estado de Resultados (P&L) que coincide con el RDO en Excel.

## Conceptos Clave

### Tipos de Items

| Tipo | Descripción | Ejemplos | Trackea Stock |
|------|-------------|----------|---------------|
| `ingrediente` | Lo que consume el cliente | Carne, pan, quesos, bebidas | ✅ Sí |
| `insumo` | Descartables y operativos | Servilletas, cajas, limpieza | ⚡ Opcional |
| `servicio` | Pagos recurrentes | Alquiler, luz, internet | ❌ No |

### Comportamiento de Costos

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `variable` | Escala con ventas | CMV, comisiones, delivery |
| `fijo` | Monto constante | Alquiler, sueldos, internet |

### Inversiones (CAPEX) vs Gastos Operativos

| Concepto | Afecta EBIT | Afecta Flujo Caja | Ejemplo |
|----------|-------------|-------------------|---------|
| Gasto Operativo | ✅ Sí | ✅ Sí | Alquiler, sueldos, luz |
| Inversión (CAPEX) | ❌ No | ✅ Sí | Heladera, remodelación |

Las inversiones se registran aparte para no distorsionar el resultado operativo mensual.

---

## Flujo de Carga Mensual

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE CARGA DEL MES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1️⃣ VENTAS                                                      │
│     └── Cargar ventas del mes (FC + FT)                        │
│                                                                 │
│  2️⃣ COMPRAS/FACTURAS                                            │
│     └── Cargar facturas de proveedores                          │
│         → Los items con categoría RDO impactan automáticamente │
│                                                                 │
│  3️⃣ CARGADOR DE RDO (por sección)                               │
│     ├── CMV: Consumos de inventario o manual                   │
│     ├── Comisiones: Datos de MP, Rappi, PedidosYa              │
│     ├── Delivery: Pagos a cadetes                              │
│     ├── Estructura: Limpieza, mantenimiento                    │
│     ├── Laborales: Sueldos, cargas sociales                    │
│     ├── Administración: Software, contador                     │
│     └── Servicios: Alquiler, luz, gas, internet                │
│                                                                 │
│  4️⃣ INVERSIONES (aparte)                                        │
│     └── Registrar CAPEX (no afecta EBIT)                       │
│                                                                 │
│  5️⃣ REVISAR RDO                                                 │
│     └── Ver resultado generado automáticamente                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Métodos de Carga por Categoría

### 1. CMV (Costo de Mercadería Vendida)

| Categoría | Método | Descripción |
|-----------|--------|-------------|
| CMV Hamburguesas | `consumo_stock` | Del informe de inventario o manual |
| Bebidas con Alcohol | `consumo_stock` | Del informe de inventario o manual |
| Bebidas sin Alcohol | `consumo_stock` | Del informe de inventario o manual |
| Descartables Salón | `consumo_stock` | Estimación basada en ventas |
| Descartables Delivery | `consumo_stock` | Estimación basada en pedidos delivery |
| Insumos Clientes | `consumo_stock` | Sobrecitos, maní, etc |

### 2. Comisiones

| Categoría | Método | Instrucciones |
|-----------|--------|---------------|
| Comisión MP Point | `automatico` | Cargar del informe de Mercado Pago |
| Comisión Rappi | `automatico` | Cargar del informe de Rappi |
| Comisión PedidosYa | `automatico` | Cargar del informe de PedidosYa |

### 3. Delivery

| Categoría | Método | Instrucciones |
|-----------|--------|---------------|
| Cadetes RappiBoy | `manual` | Total pagado a RappiBoys |
| Cadetes Terceros | `manual` | Total pagado por WhatsApp/otros |

### 4. Fee de Marca

| Categoría | Método | Instrucciones |
|-----------|--------|---------------|
| Canon 4.5% | `automatico` | Se calcula: Ventas × 4.5% (desde Mi Marca) |
| Marketing 0.5% | `automatico` | Se calcula: Ventas × 0.5% (desde Mi Marca) |

### 5. Estructura Operativa

| Categoría | Método | Instrucciones |
|-----------|--------|---------------|
| Limpieza e Higiene | `factura_proveedor` | Factura de productos de limpieza |
| Descartables Cocina | `factura_proveedor` | Descartables de uso interno |
| Mantenimiento | `factura_proveedor` | Facturas de técnicos/reparaciones |
| Uniformes | `factura_proveedor` | Compra de uniformes |

### 6. Costos Laborales

| Categoría | Método | Instrucciones |
|-----------|--------|---------------|
| Sueldos | `nomina` | Total sueldos de bolsillo |
| Cargas Sociales | `nomina` | Aportes y contribuciones |
| Comida Personal | `manual` | Viandas ESPECHE |

### 7. Administración

| Categoría | Método | Instrucciones |
|-----------|--------|---------------|
| Software Gestión | `factura_proveedor` | Factura Nucleo IT, etc |
| Estudio Contable | `factura_proveedor` | Honorarios del contador |
| Bromatología | `factura_proveedor` | Análisis de laboratorio |

### 8. Servicios e Infraestructura

| Categoría | Método | Instrucciones |
|-----------|--------|---------------|
| Alquiler | `factura_proveedor` | Recibo mensual |
| Expensas | `factura_proveedor` | Liquidación de expensas |
| Gas (ECOGAS) | `factura_proveedor` | Factura de gas |
| Internet | `factura_proveedor` | Factura AIRSAT/otro |
| Energía (EPEC) | `factura_proveedor` | Factura de luz |

---

## Inversiones (CAPEX)

Las inversiones NO afectan el resultado operativo (EBIT) pero sí el flujo de caja.

### Tipos de Inversión

| Tipo | Descripción | Ejemplos |
|------|-------------|----------|
| `equipamiento` | Equipos de cocina/local | Heladera, freidora, horno |
| `mobiliario` | Muebles y decoración | Mesas, sillas, carteles |
| `obra_civil` | Construcción/remodelación | Ampliación, instalaciones |
| `tecnologia` | Sistemas y hardware | POS, computadoras |
| `vehiculo` | Vehículos | Moto de delivery |
| `franquicia` | Fee inicial | Pago inicial de franquicia |
| `garantia` | Depósitos | Depósito de alquiler |

### Estados de Pago

- **Pagado**: Ya se pagó completamente
- **Pendiente**: Falta pagar
- **Financiado**: Se paga en cuotas

---

## Tablas de Base de Datos

### rdo_movimientos

Tabla unificada de todos los movimientos que impactan el RDO:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rdo_category_code` | text | Categoría RDO (FK) |
| `origen` | text | consumo_inventario, compra_directa, gasto_servicio, comision_plataforma, fee_marca, nomina, manual |
| `monto` | numeric | Monto del movimiento |
| `datos_extra` | jsonb | Datos adicionales (venta_total, porcentaje para comisiones) |

### inversiones

Inversiones de capital (CAPEX):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tipo_inversion` | text | equipamiento, mobiliario, obra_civil, etc |
| `monto_total` | numeric | Monto total de la inversión |
| `vida_util_meses` | int | Para calcular amortización |
| `estado` | text | pagado, pendiente, financiado |
| `cuotas_total` | int | Total de cuotas (si financiado) |

---

## Componentes UI

### CargadorRdoUnificado

Pantalla principal de carga mensual organizada por secciones:

```tsx
<CargadorRdoUnificado branchId={branchId} branchName="Local Centro" />
```

Muestra:
- Progreso de carga (% completado)
- Secciones agrupadas (CMV, Comisiones, etc)
- Estado de cada categoría (cargado/pendiente)
- Modal de carga con instrucciones

### GestorInversiones

Administración de inversiones de capital:

```tsx
<GestorInversiones branchId={branchId} />
```

### RdoDashboard

Vista del RDO generado:

```tsx
<RdoDashboard branchId={branchId} />
```

---

## Sincronización Automática

Los triggers sincronizan automáticamente:

1. **Gastos → rdo_movimientos**: Cuando se carga un gasto con `rdo_category_code`, se crea automáticamente el movimiento RDO.

2. **Facturas → rdo_movimientos**: Cuando se carga una factura, cada item con categoría RDO crea su movimiento.

3. **Vista en tiempo real**: La vista `rdo_report_data` agrega todos los movimientos por categoría y período.

---

## Migraciones

```bash
# 1. Sistema de categorías base
20260209180000_rdo_categories_system.sql

# 2. Migrar datos existentes
20260209180001_migrate_data_to_rdo.sql

# 3. Sistema unificado de carga + CAPEX
20260209190000_rdo_unified_loading_system.sql
```
