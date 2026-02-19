

# Unificar Gastos dentro del Sistema de 3 Cajas (Eliminar "Caja Chica" redundante)

## Problema actual

Existen **dos sistemas paralelos** para registrar egresos:

1. **Tabla `gastos`** (Caja Chica) -- Pagina independiente en Finanzas con categorias, aprobacion, estado de pago, vencimiento, exportacion Excel, integracion con RDO.
2. **`cash_register_movements` tipo `expense`** (QuickExpenseModal) -- Egreso rapido dentro de Caja de Ventas, solo descuenta efectivo del turno activo. Sin categorias, sin trazabilidad contable.

Ambos registran gastos menores pero en tablas distintas, sin vinculacion, y el usuario no sabe donde buscar.

## Solucion propuesta

**Eliminar la pagina "Caja Chica" como seccion separada** y mover toda la funcionalidad de registro de gastos al sistema de cajas:

- Los gastos se registran como movimientos de tipo `expense` en cualquiera de las 3 cajas
- Se agrega la metadata contable (categoria, RDO, aprobacion) directamente a `cash_register_movements`
- Se mantiene la tabla `gastos` como "vista de resumen contable" alimentada automaticamente desde los movimientos de caja

---

## Parte 1: Base de datos

### Agregar campos contables a `cash_register_movements`

```sql
ALTER TABLE cash_register_movements ADD COLUMN categoria_gasto TEXT;
ALTER TABLE cash_register_movements ADD COLUMN rdo_category_code TEXT;
ALTER TABLE cash_register_movements ADD COLUMN estado_aprobacion TEXT DEFAULT 'aprobado';
  -- 'aprobado', 'pendiente_aprobacion', 'rechazado'
ALTER TABLE cash_register_movements ADD COLUMN observaciones TEXT;
```

Esto permite que cada egreso en cualquier caja tenga la misma metadata que tenia la tabla `gastos`.

### Trigger de sincronizacion

Crear un trigger en `cash_register_movements` que, cuando el type = `expense`, inserte/actualice automaticamente en la tabla `gastos` (que ya tiene el trigger `sync_gasto_to_rdo` para alimentar el Estado de Resultados). Esto preserva la compatibilidad con ReportsPage y el RDO sin romper nada.

### Umbral de aprobacion

Gastos >= $50.000 en cajas operadas por cajeros se marcan `pendiente_aprobacion`. Franquiciado/Encargado aprueban desde la vista de Caja.

---

## Parte 2: Mejorar el modal de egreso (QuickExpenseModal)

El modal actual es basico (concepto + monto + metodo pago). Se enriquece con:

- **Selector de categoria** (las mismas categorias de CATEGORIA_GASTO_OPTIONS: propinas, movilidad, mantenimiento, etc.)
- **Categoria RDO** (opcional, el selector que ya existe como RdoCategorySelector)
- **Observaciones** (campo opcional)
- **Logica de aprobacion** automatica segun monto

El modal recibe un prop `targetShiftId` para saber a cual caja se descuenta (ventas, alivio, o fuerte). En la practica, los gastos salen de Caja de Ventas casi siempre, pero el franquiciado podria registrar un gasto desde Caja Fuerte tambien.

---

## Parte 3: Vista de gastos integrada en RegisterPage

En la pagina de Cajas (/ventas/caja), debajo de cada seccion de caja, agregar un boton/tab "Ver egresos" que muestra la lista filtrada de movimientos tipo `expense` de esa caja, con:

- Fecha, concepto, monto, categoria, estado
- Filtros por fecha y busqueda
- Boton "Excel" para exportar
- Seccion de aprobacion pendiente (para franquiciado)

Esto reemplaza la pagina GastosPage.

---

## Parte 4: Eliminar pagina Caja Chica

- Quitar la ruta `finanzas/gastos` de App.tsx
- Quitar el NavItem "Caja Chica" del sidebar (LocalSidebar.tsx)
- Mantener GastosPage.tsx como archivo pero marcarlo deprecated (o eliminarlo directamente si los reportes leen de `gastos` via trigger)
- NO eliminar la tabla `gastos` -- sigue siendo alimentada por el trigger y es consumida por ReportsPage y el RDO

---

## Parte 5: Archivos a modificar/crear

| Archivo | Cambio |
|---|---|
| Migracion SQL | Agregar campos a `cash_register_movements`, crear trigger sync a `gastos` |
| `src/components/pos/QuickExpenseModal.tsx` | Agregar categoria, RDO, observaciones. Recibir `targetShiftId` flexible |
| `src/pages/pos/RegisterPage.tsx` | Agregar boton "Egreso" en Caja de Alivio/Fuerte. Agregar vista de egresos por caja |
| `src/components/layout/LocalSidebar.tsx` | Eliminar link "Caja Chica" |
| `src/App.tsx` | Eliminar ruta `finanzas/gastos` |
| `src/pages/admin/ReportsPage.tsx` | Sin cambios (sigue leyendo de tabla `gastos` que se alimenta por trigger) |

### Nuevo componente

| Archivo | Descripcion |
|---|---|
| `src/components/pos/CajaExpensesList.tsx` | Lista de egresos de una caja con filtros, exportacion y aprobacion |

---

## Parte 6: Resumen del flujo final

```
Cajero en Caja de Ventas:
  [Egreso] -> Modal con concepto, monto, categoria, RDO (opcional)
           -> Si monto >= $50k -> pendiente_aprobacion
           -> Se registra como movement tipo 'expense' en el turno activo
           -> Trigger sincroniza a tabla 'gastos' -> trigger existente sincroniza a RDO

Franquiciado en cualquier caja:
  [Egreso] -> Mismo modal, sin limite de aprobacion
           -> Se registra directamente como aprobado
```

Los reportes (ReportsPage, RDO) siguen funcionando exactamente igual porque la tabla `gastos` sigue siendo alimentada, solo que ahora de forma automatica desde los movimientos de caja en vez de manualmente.
