

## Agregar gestión de consumos de empleados (ver, editar, eliminar)

### Problema
Hoy solo se puede cargar un consumo desde la card del empleado en Liquidación, pero no hay forma de:
- Ver el listado de consumos cargados
- Eliminar un consumo cargado por error

### Solución
Agregar un **modal de detalle** accesible desde cada card de empleado (clickeando el badge "Consumos: $X") que muestre la lista de consumos del mes con opción de eliminar cada uno.

### Implementación

**Nuevo componente: `EmployeeConsumptionListModal.tsx`**
- Modal que recibe `branchId`, `userId`, `userName`, `year`, `month`
- Muestra tabla con: Fecha, Monto, Descripción, Origen (manual/automático), botón Eliminar
- Usa `useEmployeeConsumptionsByMonth` filtrando por `user_id`
- Usa `softDelete` del hook existente para eliminar con confirmación
- Incluye el botón "Nuevo consumo" dentro del mismo modal para agregar sin cerrar

**Modificar `LaborHoursSummary.tsx`**
- Hacer clickeable el badge de "Consumos: $X" en cada card
- Al hacer click, abrir el nuevo modal de listado de consumos de ese empleado
- Agregar estado para controlar qué empleado tiene abierto el listado

### Archivos
- **Nuevo**: `src/components/local/EmployeeConsumptionListModal.tsx`
- **Modificar**: `src/components/local/LaborHoursSummary.tsx` — hacer badge clickeable y conectar modal

