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

## Estructura de Categorías RDO

```
COSTOS VARIABLES (escalan con ventas)
├── CMV (Costo de Mercadería Vendida)
│   ├── cmv_hamburguesas      → Ingredientes de hamburguesas
│   ├── cmv_bebidas_alcohol   → Cervezas, vinos
│   ├── cmv_bebidas_sin_alcohol → Gaseosas, aguas
│   ├── descartables_salon    → Servilletas, vasos salón
│   ├── descartables_delivery → Cajas, bolsas delivery
│   └── insumos_clientes      → Sobrecitos, maní
│
├── Comisiones por Venta
│   ├── comision_mp_point     → Mercado Pago Point
│   ├── comision_rappi        → Comisión Rappi
│   └── comision_pedidosya    → Comisión PedidosYa
│
├── Delivery
│   ├── cadetes_rappiboy      → Pago a RappiBoys
│   └── cadetes_terceros      → Cadetes por WhatsApp
│
└── Publicidad y Marca
    ├── fee_marca             → Canon 4.5%
    └── marketing             → Marketing 0.5%

COSTOS FIJOS (independientes de ventas)
├── Estructura Operativa
│   ├── limpieza_higiene      → Productos de limpieza
│   ├── descartables_cocina   → Descartables uso interno
│   ├── mantenimiento         → Reparaciones
│   └── uniformes             → Ropa de trabajo
│
├── Laborales
│   ├── sueldos               → Sueldos de bolsillo
│   ├── cargas_sociales       → Aportes
│   └── comida_personal       → Viandas ESPECHE
│
├── Administración
│   ├── software_gestion      → Sistemas IT
│   ├── estudio_contable      → Contador
│   └── bromatologia          → Análisis
│
└── Servicios e Infraestructura
    ├── alquiler              → Alquiler mensual
    ├── expensas              → Gastos comunes
    ├── gas                   → ECOGAS
    ├── internet_telefonia    → Internet
    └── energia_electrica     → EPEC
```

## Flujos de Trabajo

### 1. Registrar Ingrediente/Insumo

```
Usuario crea insumo
    ↓
Selecciona tipo: ingrediente | insumo
    ↓
Selecciona categoría RDO (ej: cmv_hamburguesas)
    ↓
Sistema sabe automáticamente:
  - Dónde va en el RDO
  - Si es costo variable o fijo
  - Si debe trackear stock
```

### 2. Registrar Compra de Ingredientes

```
Usuario carga factura de proveedor
    ↓
Agrega items (insumos/ingredientes)
    ↓
Cada item hereda categoría RDO del insumo
    ↓
Al cerrar, impacta en:
  - Stock (si tracks_stock = true)
  - RDO del período (según rdo_category_code)
```

### 3. Registrar Gasto de Servicio

```
Usuario registra gasto
    ↓
Selecciona categoría RDO (ej: alquiler)
    ↓
Opcionalmente asocia proveedor
    ↓
Impacta directo en RDO del período
```

## API de Consultas

### Obtener Categorías RDO

```typescript
// Todas las categorías
const { data } = useRdoCategories();

// Solo para ingredientes
const { data } = useRdoCategories({ itemType: 'ingrediente' });

// Solo costos variables
const { data } = useRdoCategories({ section: 'costos_variables' });

// Para selector (solo nivel 3, habilitadas)
const { data } = useRdoCategoryOptions('ingrediente');
```

### Obtener Reporte RDO

```typescript
// Reporte completo del período
const { data } = useRdoReport(branchId, '2026-02');

// Retorna líneas con:
// - category_code, category_name
// - total (monto)
// - percentage (% sobre ingresos)
// - rdo_section, behavior
```

## Componentes UI

### RdoCategorySelector

Selector con búsqueda y agrupación por sección:

```tsx
<RdoCategorySelector
  value={form.rdo_category_code}
  onChange={(code) => setForm({ ...form, rdo_category_code: code })}
  itemType="ingrediente"  // Filtra categorías válidas
  placeholder="Seleccionar categoría..."
/>
```

### RdoCategoryBadge

Muestra la categoría con badge de comportamiento:

```tsx
<RdoCategoryBadge code="cmv_hamburguesas" showSection />
// Muestra: "CMV Hamburguesas" [Variable]
```

### RdoDashboard

Dashboard completo del RDO:

```tsx
<RdoDashboard branchId={branchId} branchName="Local Centro" />
```

## Migraciones

### Crear estructura

```bash
# Ejecuta la migración principal
supabase db push
```

### Migrar datos existentes

```bash
# Mapea gastos e insumos existentes a categorías RDO
supabase db push # incluye 20260209180001_migrate_data_to_rdo.sql
```

## Tablas de Base de Datos

### rdo_categories

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `code` | text | Código único (PK) |
| `name` | text | Nombre display |
| `parent_code` | text | Categoría padre |
| `level` | int | 1=sección, 2=categoría, 3=subcategoría |
| `rdo_section` | text | costos_variables, costos_fijos, etc |
| `behavior` | text | variable, fijo |
| `allowed_item_types` | text[] | Tipos de items permitidos |

### Campos agregados a tablas existentes

**insumos:**
- `tipo_item`: 'ingrediente' | 'insumo'
- `rdo_category_code`: FK a rdo_categories
- `tracks_stock`: boolean

**gastos:**
- `rdo_category_code`: FK a rdo_categories
- `proveedor_id`: FK a proveedores

**items_factura:**
- `rdo_category_code`: FK a rdo_categories

**proveedores:**
- `tipo_proveedor`: text[] (ingrediente, insumo, servicio)
- `rdo_categories_default`: text[]

## Vista rdo_report_data

Consolida todos los costos por categoría RDO:

```sql
SELECT * FROM rdo_report_data
WHERE branch_id = 'xxx' AND periodo = '2026-02';
```

## Función get_rdo_report

Genera el reporte completo con porcentajes:

```sql
SELECT * FROM get_rdo_report('branch-uuid', '2026-02');
```

## Compatibilidad

El sistema mantiene compatibilidad con los campos legacy:

- `categoria_principal` en gastos se sigue llenando
- `categoria_pl` en insumos se deriva de la categoría RDO
- La vista clásica de P&L sigue funcionando

## Mejoras Futuras

1. **Stock en tiempo real**: Descontar stock al registrar venta
2. **Alertas de precio**: Notificar cuando precio supera máximo sugerido
3. **Comparativo mensual**: Gráficos de evolución por categoría
4. **Presupuesto**: Definir presupuesto por categoría y comparar
5. **Exportar a Excel**: Generar RDO en formato Excel idéntico al actual
