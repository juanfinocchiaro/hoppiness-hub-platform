

## Filtrar ingredientes ya seleccionados en la Ficha Tecnica de Recetas

### Problema
Cuando estas editando una receta y ya seleccionaste un insumo o una preparacion, ese mismo item sigue apareciendo en el dropdown para nuevas lineas. Esto puede causar duplicados accidentales.

### Solucion
Filtrar automaticamente los insumos y preparaciones ya seleccionados del listado de opciones disponibles en cada fila. Si un insumo ya esta en la fila 1, no aparece en el dropdown de la fila 2 (pero si sigue visible en el dropdown de la fila 1, donde ya esta seleccionado).

Esto funciona correctamente incluso con recetas que contienen sub-recetas, ya que los insumos y las preparaciones se manejan en listas separadas.

---

### Detalles tecnicos

**Archivo**: `src/pages/admin/PreparacionesPage.tsx`

**Cambio en `FichaTecnicaTab`** (lineas ~762-808):

Para cada fila del editor, calcular las opciones disponibles excluyendo los IDs ya usados en otras filas:

1. **Insumos**: Recopilar todos los `insumo_id` ya seleccionados en otras filas (excluyendo la fila actual). Filtrar `ingredientesDisponibles` para no mostrar esos IDs.

2. **Preparaciones**: Recopilar todos los `sub_preparacion_id` ya seleccionados en otras filas (excluyendo la fila actual). Filtrar `preparacionesDisponibles` para no mostrar esos IDs.

Logica por fila:
```
const usedInsumoIds = items
  .filter((_, idx) => idx !== index)
  .map(i => i.insumo_id)
  .filter(Boolean);

const usedPrepIds = items
  .filter((_, idx) => idx !== index)
  .map(i => i.sub_preparacion_id)
  .filter(Boolean);

// Filtrar opciones
ingredientesDisponibles.filter(i => !usedInsumoIds.includes(i.id))
preparacionesDisponibles.filter(p => !usedPrepIds.includes(p.id))
```

Tambien se aplicara el mismo patron al componente `FichaTecnicaModal` (`src/components/menu/FichaTecnicaModal.tsx`) y al `OpcionesTab` dentro de `PreparacionesPage.tsx` para mantener consistencia en todo el sistema.

