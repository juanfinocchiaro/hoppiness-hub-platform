

## Rediseño de Liquidación: Cards individuales por empleado

### Cambio principal

Reemplazar la tabla global con 13 columnas por **una Card por empleado**. Eliminar el rol del sistema (Cajero/Empleado) que no corresponde a liquidación.

### Layout propuesto por card

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [AG] Agustín Gómez                              📥 ▾   ▼          │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│  PUESTO        HS TRAB  HS REG  FERIADOS  FRANCO  EXT.H  EXT.I    │
│  Sandwichero     24.0    24.0      -        -       -       -      │
│  Cajero          16.0    16.0      -        -       -       -      │
│  ─────────────────────────────────────────────────────────────────  │
│  TOTAL           40.0    40.0      -        -       -       -      │
│                                                                     │
│  Vacaciones: -  ·  Faltas Inj: 0  ·  F. Just: -  ·  Tardanza: 0m │
│                                              Presentismo: ✅ SI    │
└─────────────────────────────────────────────────────────────────────┘
```

Para empleados con **un solo puesto**, se muestra una sola fila (sin sub-filas ni TOTAL).

### Cambios en `src/components/local/LaborHoursSummary.tsx`

1. **Eliminar la tabla global** (`<Table>` con `<TableHeader>` de 13 columnas) y el componente `EmployeeRow` actual

2. **Crear un nuevo componente `EmployeeCard`** dentro del mismo archivo:
   - **Header**: Avatar + nombre (sin rol del sistema) + botones export/expand
   - **Mini-tabla interna**: Solo 7 columnas (Puesto, Hs Trab, Hs Reg, Feriados, Franco, Ext Hábil, Ext Inhábil) — las que varían por puesto
   - Si hay múltiples puestos: sub-filas + fila TOTAL con separador y font-bold
   - Si hay un solo puesto: fila única con nombre del puesto
   - **Barra de métricas globales** debajo de la tabla: Vacaciones, Faltas Inj, Falta Just, Tardanza como chips/badges inline en una fila horizontal
   - **Badge de Presentismo**: SI/NO con color verde/rojo, alineado a la derecha de la barra de métricas
   - **Sección expandible**: El detalle de fichajes se mantiene igual (click en chevron)

3. **Eliminar `LOCAL_ROLE_LABELS`** import y la línea que muestra el rol debajo del nombre (línea 114)

4. **Renderizar como lista de cards**: `summaries.map(s => <EmployeeCard ... />)` con `space-y-3`

5. **Las stats cards superiores, leyenda y controles de mes no cambian**

### Resultado
- Sin scroll horizontal
- Sin celdas vacías con "-"
- Sin rol del sistema (irrelevante para liquidación)
- Cada empleado es escaneable de un vistazo
- Las métricas globales (faltas, tardanza) se leen como badges, no como columnas

### Archivos a modificar
- `src/components/local/LaborHoursSummary.tsx` — único archivo

