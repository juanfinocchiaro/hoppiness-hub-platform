
# Plan: Rediseño de Horarios - Cobertura Integrada

## Problema Actual

La UI tiene **dos grids separados** (Cards independientes) que intentan sincronizar scroll pero:
- Visualmente se sienten como "dos cosas distintas"
- El título "Cobertura por Hora" interrumpe la continuidad
- Los días de arriba no están perfectamente alineados con los de abajo
- El scroll sincronizado entre dos elementos es propenso a errores

## Solución Propuesta

Integrar la **cobertura por hora como filas de resumen** al final del mismo grid de empleados:

```text
+------------------+-------+-------+-------+-------+
| Empleado         | Lun 1 | Mar 2 | Mié 3 | Jue 4 | ...
+------------------+-------+-------+-------+-------+
| Juan Pérez       | 11-19 | 11-19 | Franco| 14-22 |
| María López      | 12-20 | Franco| 11-19 | 11-19 |
| Carlos García    | 18-23 | 18-23 | 18-23 | 18-23 |
+==================+=======+=======+=======+=======+
|  COBERTURA       |       |       |       |       |
| 11:00            |   2   |   1   |   1   |   2   |
| 12:00            |   2   |   1   |   1   |   2   |
| ...              |  ...  |  ...  |  ...  |  ...  |
| 22:00            |   2   |   1   |   1   |   2   |
+------------------+-------+-------+-------+-------+
```

## Cambios a Realizar

### 1. Estructura Unificada
- Eliminar la Card separada de "Cobertura por Hora"
- Mover las filas de cobertura al final del mismo contenedor scrollable
- Un solo scroll horizontal = alineación perfecta garantizada

### 2. Separador Visual
- Agregar una fila divisoria con fondo diferenciado entre empleados y cobertura
- Texto pequeño "Cobertura por hora" en gris, inline con la columna de empleados
- Fondo sutilmente diferente (gris claro) para las filas de cobertura

### 3. Columna Fija de Horas
- La columna izquierda mostrará:
  - Nombre del empleado (para filas de horarios)
  - Hora (11:00, 12:00, etc.) para filas de cobertura
- Misma posición sticky, un solo elemento

### 4. Mantener Funcionalidad
- Los días siguen siendo clickeables para editar horarios
- La cobertura sigue siendo hora-a-hora dinámica
- Colores de cobertura: Rojo (<2), Ámbar (2-3), Verde (4+)
- Solo se muestran las horas donde hay al menos 1 empleado

## Diseño Final Esperado

```text
┌────────────────────────────────────────────────────────┐
│  📅 Horarios del Equipo                    [leyenda]   │
├──────────────┬────┬────┬────┬────┬────┬────┬────┬─────┤
│ Empleado     │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ ... │◄─ scroll →
├──────────────┼────┼────┼────┼────┼────┼────┼────┼─────┤
│ Juan         │    │    │    │    │    │    │    │     │
│ María        │    │    │    │    │    │    │    │     │
│ Carlos       │    │    │    │    │    │    │    │     │
├──────────────┴────┴────┴────┴────┴────┴────┴────┴─────┤
│ ─────────────── Cobertura por hora ─────────────────  │  ← separador sutil
├──────────────┬────┬────┬────┬────┬────┬────┬────┬─────┤
│ 11:00        │ 2  │ 1  │ 1  │ 2  │ 2  │ 1  │ 0  │     │  ← fondo gris
│ 12:00        │ 2  │ 2  │ 2  │ 2  │ 2  │ 2  │ 0  │     │
│ ...          │    │    │    │    │    │    │    │     │
│ 22:00        │ 1  │ 1  │ 1  │ 1  │ 1  │ 1  │ 0  │     │
└──────────────┴────┴────┴────┴────┴────┴────┴────┴─────┘
```

## Archivo a Modificar

`src/components/hr/InlineScheduleEditor.tsx`

## Secciones Técnicas

### Estructura del Componente
1. Eliminar `coverageScrollRef` y `handleCoverageScroll` (ya no necesarios)
2. Mantener un solo `scheduleScrollRef` para todo el grid
3. Combinar empleados + cobertura en el mismo div scrollable

### Layout
- **Columna fija izquierda**: muestra "Empleado" luego nombres, luego separador, luego horas
- **Contenedor scrollable**: días de cabecera + celdas de horario + separador + celdas de cobertura

### Separador Visual
- Fila con `border-t-2 border-dashed` y texto "Cobertura por hora"
- Altura reducida (~32px)
- Sin interacción

### Filas de Cobertura
- `bg-muted/40` para diferenciarse visualmente
- Altura de 28px (más compactas que las de empleados)
- Mismo ancho de columna (`DAY_WIDTH = 80`)
