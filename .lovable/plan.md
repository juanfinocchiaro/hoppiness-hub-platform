

## Mover Extras dentro de la pestaña Análisis

### Cambio principal

Eliminar la pestaña "Extras" como tab separado e integrar la tabla de extras como una sección adicional al final de la pestaña "Análisis", debajo del footer de CMV Global. Así todo queda en una sola vista y cuando haya ventas, el análisis de extras estará en contexto con el resto del CMV.

### Cómo queda la interfaz

```text
Pestañas: [Análisis] [Simulador] [Actualizar Precios]   (sin tab Extras)

--- Análisis ---
  KPIs (CMV, Margen, Semáforo...)
  Buscador + Filtros
  
  > ULTRASMASH (2)              CMV 39.1%
    Combo Ultracheese...
    Combo Ultrabacon...
  > CLASICAS (1)                CMV 33.3%
    American con papas...
  
  CMV Global: 37.5%

  ─────────────────────────────
  EXTRAS DISPONIBLES (2)
  ─────────────────────────────
  Buscar extra...
  
  Nombre              | Tipo    | Costo  | P. Extra | FC%
  Cebolla Crispy      | Receta  | $6     | [___]    | —
  Provoleta grillada   | Receta  | $461   | [-1]     | —
  
  2 extras disponibles · FC% = costo / (precio / 1.21) x 100
```

### Cambios técnicos

**Archivo: `src/pages/admin/CentroCostosPage.tsx`**

1. Eliminar `'extras'` del tipo `Tab` (queda `'analisis' | 'simulador' | 'actualizar'`)
2. Eliminar la entrada `{ id: 'extras', ... }` del array `tabs`
3. Eliminar la línea `{tab === 'extras' && <ExtrasTab ... />}`
4. Mover el contenido de `ExtrasTab` al final de `AnalisisTab`:
   - Pasar `preparaciones` e `insumos` como props a `AnalisisTab`
   - Después del div del CMV Global footer, agregar un separador y renderizar la sección de extras inline (reutilizando la misma lógica de `ExtrasTab`)
   - Mostrar con un titulo "Extras Disponibles" usando el mismo estilo de sección colapsable que las categorías
5. `ExtrasTab` como función separada puede permanecer o fusionarse dentro de `AnalisisTab` -- se fusiona para simplificar

### Lo que NO cambia

- La lógica de extras (hook, mutations, edición de precio inline, FC%) sigue igual
- La tabla `item_carta_extras` y todo el backend no se tocan
- El `ItemExpandedPanel` con su sección de extras por item tampoco cambia
