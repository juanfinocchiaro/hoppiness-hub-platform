

# Auditoria del Dashboard de Mi Local (Manantiales)

## Problemas Encontrados

### 1. Orden de turnos invertido (Noche antes de Mediodia)
**Severidad: Media**

En la base de datos, los turnos "Noche" y "Mediodia" tienen el mismo `sort_order = 2`. Esto causa que el orden sea indeterminado y aparezca "Noche" primero. Logicamente, Mediodia deberia aparecer antes que Noche.

**Solucion:** Corregir los valores de `sort_order` en la tabla `branch_shifts` para Manantiales: Mediodia = 2, Noche = 3. Revisar si otras sucursales tienen el mismo problema.

---

### 2. "Comunicados sin leer" siempre muestra 0 (hardcodeado)
**Severidad: Alta**

En el hook `usePendingItems` (linea 142), el valor `unreadComms` esta hardcodeado a `0`:

```text
return {
  pendingRequests: pendingRequests || 0,
  unreadComms: 0,  // <-- HARDCODED, nunca se calcula
  pendingSignatures,
  total: ...
};
```

No se hace ninguna consulta a la tabla `communications` / `communication_reads` para calcular los comunicados sin leer del equipo.

**Solucion:** Consultar la tabla `communications` y `communication_reads` para contar cuantos comunicados no fueron leidos por los empleados de la sucursal.

---

### 3. Calculo incorrecto del badge "Pendientes" (total)
**Severidad: Media**

La formula del total en linea 144 es inconsistente:

```text
total: (pendingRequests || 0) + (pendingSignatures > 0 ? 1 : 0)
```

Esto suma las solicitudes pendientes (1) + 1 si hay **alguna** firma pendiente, dando total = 2 en la screenshot. Pero no refleja la cantidad real de items pendientes. Deberia sumar los 3 contadores: solicitudes + comunicados sin leer + firmas pendientes.

**Solucion:** Cambiar la formula a: `pendingRequests + unreadComms + pendingSignatures`.

---

### 4. Boton "Cargar" no visible
**Severidad: Baja**

El boton "Cargar" solo se muestra si `local.canEnterSales && !posEnabled`. Si el POS esta habilitado para Manantiales, el boton no aparece (correcto), pero tampoco hay indicacion visual de que las ventas se cargan via POS. Esto podria confundir al encargado.

**Nota:** Este comportamiento es probablemente correcto si el local usa POS. No requiere cambio.

---

### 5. StockAlertCard no visible
**Severidad: Informativa**

El componente `StockAlertCard` se renderiza pero solo aparece si hay items criticos o bajos. Si no hay alertas, no muestra nada (correcto por diseno).

---

## Plan de Implementacion

### Paso 1: Corregir sort_order de turnos en la DB
Ejecutar migracion SQL para corregir el orden de los turnos en `branch_shifts` para todas las sucursales donde Mediodia y Noche tengan el mismo sort_order.

### Paso 2: Implementar calculo real de comunicados sin leer
Modificar `usePendingItems` en `ManagerDashboard.tsx` para:
- Consultar `communications` enviados a la sucursal
- Cruzar con `communication_reads` para contar los no leidos por el equipo
- Asignar el resultado a `unreadComms`

### Paso 3: Corregir formula del badge total de Pendientes
Cambiar la formula para sumar todos los contadores reales: `pendingRequests + unreadComms + pendingSignatures`.

---

## Detalle Tecnico

### Migracion SQL (Paso 1)
```text
-- Corregir sort_order para que Mediodia=2 y Noche=3
UPDATE branch_shifts SET sort_order = 2 WHERE name = 'Mediodía' AND sort_order != 2;
UPDATE branch_shifts SET sort_order = 3 WHERE name = 'Noche';
```

### Cambios en ManagerDashboard.tsx (Pasos 2 y 3)
En el hook `usePendingItems`:
- Agregar query para contar comunicados sin leer por empleados de la sucursal
- Calcular `unreadComms` con datos reales de `communications` + `communication_reads`
- Actualizar formula: `total: pendingRequests + unreadComms + pendingSignatures`

