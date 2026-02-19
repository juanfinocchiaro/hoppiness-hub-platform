

# Fix: Mostrar desglose FC/FT cuando todo es efectivo

## Problema

La condicion `ventas.fc > 0` oculta el desglose FC (Facturacion Contable) / FT (Facturacion Total) cuando todas las ventas son en efectivo, ya que FC = Total - Efectivo = 0.

## Causa raiz

En `src/components/rdo/RdoDashboard.tsx`, tres lugares usan `ventas.fc > 0` como condicion de renderizado:

1. **Linea 224** (KPI card de Ventas): no muestra "FC: $X | FT: $X"
2. **Linea 274** (RDO detallado con promos): no muestra desglose FC/FT dentro del collapsible
3. **Linea 299** (RDO detallado sin promos): misma condicion

## Solucion

Cambiar las 3 condiciones de `ventas.fc > 0` a `ventas.total > 0` en `RdoDashboard.tsx`. Esto muestra el desglose siempre que haya ventas, incluso si FC = 0 (todo efectivo).

### Detalle tecnico

| Linea | Antes | Despues |
|---|---|---|
| 224 | `ventas && ventas.fc > 0` | `ventas && ventas.total > 0` |
| ~274 | `ventas && ventas.fc > 0` | `ventas && ventas.total > 0` |
| ~299 | `ventas && ventas.fc > 0` | `ventas && ventas.total > 0` |

Un solo archivo modificado: `src/components/rdo/RdoDashboard.tsx`.

