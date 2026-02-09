
# Plan: Sistema Financiero MVP - Estado Actual

## ✅ COMPLETADO: Base de Datos (4 migraciones ejecutadas)

### Tablas creadas (16 total):
- `categorias_insumo`, `insumos`, `proveedores`
- `compras`, `pagos_proveedores`, `gastos`
- `ventas_mensuales_local`, `canon_liquidaciones`, `pagos_canon`
- `consumos_manuales`, `socios`, `movimientos_socio`
- `distribuciones_utilidades`, `periodos`, `configuracion_impuestos`
- `financial_audit_log`

### Triggers activos:
- `calcular_porcentaje_ft` (ventas_mensuales_local)
- `calcular_canon` (canon_liquidaciones)
- `actualizar_saldo_compra` (pagos_proveedores)
- `actualizar_saldo_canon` (pagos_canon)
- `validar_periodo_abierto` (compras, gastos, consumos_manuales)
- `check_porcentajes_suman_100` (socios)
- `calcular_saldo_socio` (movimientos_socio)
- `procesar_distribucion_utilidades` (distribuciones_utilidades)
- `audit_financial_changes` (todas las tablas financieras)

### Vistas:
- `precio_promedio_mes` (SECURITY INVOKER)
- `cuenta_corriente_proveedores` (SECURITY INVOKER)
- `balance_socios` (SECURITY INVOKER)

### Funciones helper nuevas:
- `get_iibb_alicuota(branch_id, fecha)`
- `is_socio_admin(user_id, branch_id)`

### RLS Policies: Completas en todas las tablas

## ✅ COMPLETADO: Proveedores + Insumos (Frontend)

### Archivos creados:
- `src/types/financial.ts` - Tipos y constantes
- `src/hooks/useProveedores.ts` - CRUD proveedores
- `src/hooks/useInsumos.ts` - CRUD insumos y categorías
- `src/components/finanzas/ProveedorFormModal.tsx` - Modal crear/editar proveedor
- `src/components/finanzas/InsumoFormModal.tsx` - Modal crear/editar insumo
- `src/components/finanzas/CategoriaFormModal.tsx` - Modal crear/editar categoría
- `src/pages/admin/ProveedoresPage.tsx` - CRUD completo (Mi Marca)
- `src/pages/admin/InsumosPage.tsx` - CRUD con tabs Insumos/Categorías (Mi Marca)
- `src/pages/local/ProveedoresLocalPage.tsx` - Vista read-only (Mi Local)
- `src/pages/local/InsumosLocalPage.tsx` - Vista read-only (Mi Local)

### Navegación:
- Mi Marca: sección "Finanzas" con Proveedores e Insumos
- Mi Local: sección "Finanzas" con consulta read-only

### Rutas:
- `/mimarca/finanzas/proveedores`
- `/mimarca/finanzas/insumos`
- `/milocal/:branchId/finanzas/proveedores`
- `/milocal/:branchId/finanzas/insumos`

## 🔜 PENDIENTE: Frontend (módulos restantes)

Orden sugerido:
1. ~~Proveedores + Insumos (CRUD básico)~~ ✅
2. Compras + Pagos
3. Gastos
4. Ventas mensuales + Canon
5. Consumos manuales
6. Socios + Distribuciones
7. Períodos (cierre/reapertura)
8. Dashboard P&L
