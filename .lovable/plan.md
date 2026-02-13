

## Costo de extras basado en porcion de la receta

### Que cambia
Una sola linea en `src/hooks/useExtraAutoDiscovery.ts` (linea 59).

### Cambio

**Archivo: `src/hooks/useExtraAutoDiscovery.ts`**

Linea 59, dentro del loop de ingredientes descubiertos:

```
// Antes
costo: ing.costo_por_unidad_base || 0,

// Despues
costo: (ing.costo_por_unidad_base || 0) * (ing.cantidad || 1),
```

### Por que funciona correctamente

- **Receta simple** (ej. "Hamburguesa Bacon" con 3 fetas de panceta): el extra tomara el costo de las 3 fetas, que es la porcion real.
- **Receta con sub-preparaciones** (ej. "Baconator" con 3x "Medallon 90g"): el sistema descubre los ingredientes desde la receta del **Medallon**, donde la panceta tiene cantidad 1. No multiplica por los 3 medallones del Baconator.
- **Deduplicacion**: si un insumo aparece en varias sub-preparaciones, solo se toma la primera ocurrencia, evitando duplicar costos.

### Extras ya existentes
Los extras que ya fueron auto-creados no se actualizan automaticamente. Para que tomen el nuevo costo, hay que desactivar y reactivar el toggle del extra en la pestana Composicion del producto.

