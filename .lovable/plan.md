

## Agregar detalle de consumos y adelantos al PDF individual

### Problema
El PDF individual del empleado solo muestra los totales de consumos y adelantos como stat cards, pero el empleado necesita ver el desglose: fecha y concepto de cada consumo y adelanto para poder controlar.

### Solución
Agregar dos tablas compactas después de las stat cards (y antes del detalle diario) con el listado detallado de consumos y adelantos del mes.

### Cambios

#### 1. Ampliar el tipo de `financialData` en `exportEmployeePDF`
Pasar de `{ consumos: number; adelantos: number }` a incluir los items detallados:
```
financialData?: {
  consumos: number;
  adelantos: number;
  consumoItems: { date: string; description: string; amount: number }[];
  adelantoItems: { date: string; reason: string; amount: number; status: string }[];
}
```

#### 2. En `laborEmployeeExport.ts` — después de las stat cards y antes del detalle diario
- Si hay `consumoItems.length > 0`: tabla con header violeta, columnas Fecha | Descripción | Monto
- Si hay `adelantoItems.length > 0`: tabla con header indigo, columnas Fecha | Motivo | Monto | Estado
- Totales en fila final de cada tabla (bold)
- Misma estética que el resto del PDF (zebra-striping, bordes suaves)

#### 3. En `LaborHoursSummary.tsx` — al llamar `exportEmployeePDF`
- Filtrar los datos crudos de `consumptions` y `advances` (ya disponibles en el componente) por `user_id` del empleado
- Mapear a la estructura esperada y pasar como parte de `empFin`

#### 4. También actualizar `exportEmployeeExcel` para incluir las mismas secciones detalladas

### Archivos a modificar
- `src/utils/laborEmployeeExport.ts` — agregar tablas de detalle financiero
- `src/components/local/LaborHoursSummary.tsx` — pasar items detallados al exportar

