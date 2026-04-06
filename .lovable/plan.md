

## Mostrar una fila por puesto en la tabla de Liquidación

### Idea

En vez de una sola fila por empleado con los puestos listados en texto, cada empleado tendrá **N filas** (una por cada puesto que ocupó en el mes) y una **fila TOTAL** que consolida todo. Visualmente quedaría así:

```text
┌──────────────────────┬───────┬───────┬─────┬─────┬─────┬─────┬───────┬───────┬───────┬────────┬──────┐
│ Empleado             │Hs Trab│Hs Reg │Vac  │F.Inj│F.Jus│Tard │Ferias │Franco │Ext.Háb│Ext.Inh │Pres. │
├──────────────────────┼───────┼───────┼─────┼─────┼─────┼─────┼───────┼───────┼───────┼────────┼──────┤
│ Agustín Gómez        │       │       │     │     │     │     │       │       │       │        │      │
│  └ Sandwichero       │ 24.0  │ 24.0  │  -  │  -  │  -  │  -  │   -   │   -   │   -   │   -    │      │
│  └ Cajero            │ 16.0  │ 16.0  │  -  │  -  │  -  │  -  │   -   │   -   │   -   │   -    │      │
│  TOTAL               │ 40.0  │ 40.0  │  0  │  0  │  -  │ 0m  │   -   │   -   │   -   │   -    │ SI   │
├──────────────────────┼───────┼───────┼─────┼─────┼─────┼─────┼───────┼───────┼───────┼────────┼──────┤
│ María López          │       │       │     │     │     │     │       │       │       │        │      │
│  └ Cajero            │ 35.0  │ 35.0  │  -  │  -  │  -  │  -  │   -   │   -   │   -   │   -    │      │
│  TOTAL               │ 35.0  │ 35.0  │  0  │  0  │  -  │ 0m  │   -   │   -   │   -   │   -    │ SI   │
└──────────────────────┴───────┴───────┴─────┴─────┴─────┴─────┴───────┴───────┴───────┴────────┴──────┘
```

### Cambios

**1. `src/hooks/useLaborHours.ts`**
- Agregar `hoursByPosition: Record<string, number>` al tipo `EmployeeLaborSummary`
- En el loop diario, cruzar cada día con `positionByDate` para acumular horas por posición
- También desglosar las sub-categorías por posición: regulares, extras hábil, extras inhábil, feriados, franco (nuevo tipo `PositionBreakdown`)

**2. `src/components/local/LaborHoursSummary.tsx`**
- Cambiar `EmployeeRow` para renderizar:
  - Una fila "header" con avatar + nombre + rol de sistema (sin datos numéricos, o solo como agrupador)
  - Una sub-fila por cada posición con indent visual (`pl-8`), mostrando las horas desglosadas de ese puesto
  - Una fila "TOTAL" con fondo destacado que suma todo y muestra presentismo, faltas, tardanza, vacaciones (datos que son globales del empleado)
- Las filas de posición y total se muestran siempre (no requieren expandir)
- El expand/collapse sigue mostrando el detalle de fichajes día a día

**3. `src/utils/laborExport.ts` y `laborEmployeeExport.ts`**
- Replicar la misma estructura en PDF/Excel: sub-filas por posición + fila total por empleado

### Detalle técnico del desglose por posición

```typescript
// Nuevo tipo
interface PositionBreakdown {
  position: string;
  hsTrabajadas: number;
  hsRegulares: number;
  hsExtrasDiaHabil: number;
  hsExtrasInhabil: number;
  feriadosHs: number;
  hsFrancoTrabajado: number;
}

// En EmployeeLaborSummary
positionBreakdown: PositionBreakdown[];
```

En el loop diario existente, donde ya se clasifica cada día, se agrega la acumulación por posición usando el `work_position` del schedule de ese día. Los días sin posición asignada se agrupan bajo "Sin puesto".

