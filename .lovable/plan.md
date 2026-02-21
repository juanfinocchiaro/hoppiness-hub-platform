

# Auditoria y Correcciones: 4 Problemas del Dashboard y Modulos del Local

---

## Problema 1: Panel "Tienda Online" desordenado

**Diagnostico:** La pagina `WebappConfigPage.tsx` tiene toda la configuracion en cards separadas sin jerarquia clara. Los servicios (Retiro, Delivery, Comer aca) son toggles planos sin posibilidad de expandir configuraciones individuales. Los horarios son un unico rango por servicio (no por dia de semana). La config de Delivery esta en una card separada, los tiempos de preparacion en otra, y los horarios en otra. No queda claro que toggle afecta que.

**Solucion: Redisenar con servicios expandibles**

Cada servicio se convierte en una seccion Collapsible que al activarse muestra:
- Toggle on/off del servicio
- Al expandir: tiempos de preparacion propios del servicio
- Horarios POR DIA DE SEMANA (Lunes a Domingo), cada uno con toggle activo/inactivo + hora desde/hasta
- Para Delivery ademas: radio, costo, pedido minimo

La estructura `service_schedules` en la DB (JSONB) se amplia de:
```text
{ retiro: { from: "10:00", to: "23:00", enabled: true } }
```
a:
```text
{
  retiro: {
    enabled: true,
    prep_time: 15,
    days: {
      lunes: { enabled: true, from: "11:00", to: "23:00" },
      martes: { enabled: true, from: "11:00", to: "23:00" },
      ...
      domingo: { enabled: true, from: "11:00", to: "15:00" }
    }
  },
  delivery: {
    enabled: true,
    prep_time: 40,
    radio_km: 5,
    costo: 500,
    pedido_minimo: 3000,
    days: { ... }
  },
  comer_aca: {
    enabled: true,
    prep_time: 15,
    days: { ... }
  }
}
```

La seccion "Recepcion de pedidos" (auto/manual, auto-accept, auto-print) se mantiene como card separada al final.

No se necesita migracion SQL ya que `service_schedules` es JSONB y puede cambiar de estructura sin alterar la tabla. Se mantiene retrocompatibilidad con el formato anterior.

### Archivos a modificar:
- `src/pages/local/WebappConfigPage.tsx` - Rediseno completo del layout

---

## Problema 2: Disponibilidad de productos en Tienda Online y POS

**Diagnostico:** Actualmente no hay mecanismo visible para apagar/prender productos de la tienda online desde el panel del local. Tampoco hay un toggle de disponibilidad en el POS que mueva productos a una categoria "Apagados".

**Nota:** Este es un desarrollo significativo que requiere su propio ciclo. Se recomienda implementar en una segunda fase, ya que implica:
- Agregar columna `disponible` a `items_carta` o tabla de disponibilidad por sucursal
- UI para toggle en el panel del local
- Logica en el POS para filtrar/categorizar items apagados
- Logica en la WebApp publica para ocultar items no disponibles

**Por ahora: no incluir en esta iteracion**, ya que los otros 3 puntos son correcciones criticas.

---

## Problema 3: Reportes Fiscales - Reimprimir no funciona

**Diagnostico:** El `ReimprimirCard` en `FiscalReportsPage.tsx` (lineas 547-671) lista los comprobantes correctamente, pero NO tiene boton de reimprimir por cada fila. Solo muestra la informacion del comprobante sin accion posible. Falta un boton `<Printer>` por cada resultado que genere y envie el ticket a la impresora.

**Solucion:**

Agregar un boton de impresion por cada comprobante en la lista de resultados. Al hacer clic:
1. Obtener los datos completos del pedido asociado (`pedido_items`, pagos, etc.)
2. Generar el ticket fiscal usando `generateTicketCliente` de `escpos.ts`
3. Enviarlo a la impresora de tickets configurada via Print Bridge

### Archivos a modificar:
- `src/pages/local/FiscalReportsPage.tsx` - Agregar boton reimprimir por fila en `ReimprimirCard`

---

## Problema 4: Dashboard - Fichajes y Ventas no se muestran

### 4a. Fichajes: "Equipo Ahora" muestra 0 pero hay empleados fichados

**Diagnostico:** En `ManagerDashboard.tsx`, el hook `useCurrentlyWorking` (linea 76) filtra con `v.type === 'entrada'`, pero la tabla `clock_entries` usa `entry_type = 'clock_in'` / `'clock_out'`. La condicion nunca matchea, por eso siempre muestra "Nadie fichado".

**Solucion:** Cambiar la comparacion en linea 76 de `'entrada'` a `'clock_in'`.

### 4b. Ventas Hoy: muestra $0 pero hay ventas POS

**Diagnostico:** El dashboard usa `useTodayClosures` (shift_closures) para mostrar ventas. Pero cuando el POS esta habilitado, las ventas estan en la tabla `pedidos`, no en `shift_closures`. Hoy (2026-02-21) hay pedidos entregados por $15,800 pero no hay shift_closures para hoy, por eso muestra $0.

El componente `ManagerDashboard` recibe `posEnabled` como prop pero NO lo usa para cambiar la fuente de datos de "Ventas Hoy".

**Solucion:** Cuando `posEnabled = true`, en vez de mostrar cards de turnos (mediodia/noche), mostrar un resumen de ventas del dia desde la tabla `pedidos` (pedidos entregados/listos de hoy). Incluir:
- Total vendido hoy (suma de pedidos no cancelados)
- Cantidad de pedidos
- Ticket promedio
- Link a historial de ventas

### Archivos a modificar:
- `src/components/local/ManagerDashboard.tsx` - Fix `'entrada'` -> `'clock_in'` y agregar vista POS para ventas

---

## Resumen de cambios

| Archivo | Cambio |
|---------|--------|
| `WebappConfigPage.tsx` | Rediseno con servicios expandibles y horarios por dia |
| `FiscalReportsPage.tsx` | Boton reimprimir por fila en ReimprimirCard |
| `ManagerDashboard.tsx` | Fix fichajes (`clock_in`), ventas POS en tiempo real |

No se requieren migraciones SQL ya que todos los cambios son en la capa de UI/hooks.

