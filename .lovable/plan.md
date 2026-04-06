

## Mejorar sección Liquidación en el panel de empleado

### Problema
La sección "Liquidación" del EmployeeSummaryPanel muestra consumos y adelantos solo si existe `payrollRow`, y el diseño es básico (bordes grises sin color). Debe verse igual de lindo que el resumen mensual en la página de Liquidación.

### Cambios en `src/components/local/EmployeeSummaryPanel.tsx`

#### 1. Agregar fetch directo de consumos y adelantos
- Importar `useEmployeeConsumptionsByMonth` y `useSalaryAdvancesByMonth` del hook existente
- Filtrar por `userId` y calcular totales directamente, sin depender de `payrollRow`
- Esto garantiza que los datos se muestren incluso sin cierre contable

#### 2. Rediseñar las mini-cards con colores de marca
Reemplazar los `div` con borde gris por cards coloreadas con iconos, similar al estilo de la UI de Liquidación:

- **Hábiles** → fondo azul claro (`bg-blue-50`), texto azul
- **Feriados** → fondo violeta claro (`bg-violet-50`)
- **Extras hábil** → fondo naranja claro (`bg-amber-50`), texto naranja
- **Extras fco/fer** → fondo naranja claro
- **Faltas inj.** → fondo rojo claro (`bg-red-50`), texto rojo si > 0
- **Lic. enf.** → fondo gris claro
- **Consumos** → fondo violeta claro (`bg-violet-50`), texto violeta, siempre visible
- **Adelantos** → fondo indigo claro (`bg-indigo-50`), texto indigo, siempre visible
- **Presentismo** → fondo verde/rojo según SI/NO

Cada card: valor grande arriba (font-bold), etiqueta chica abajo (text-muted), borde coloreado sutil.

#### 3. Mostrar consumos y adelantos siempre (no solo con payrollRow)
- Consumos: total del mes desde `employee_consumptions`
- Adelantos: total del mes desde `salary_advances`
- Mostrar "$0" si no hay registros en vez de ocultar

### Archivo a modificar
- `src/components/local/EmployeeSummaryPanel.tsx`

