

## Nueva pestaña "Extras" en Centro de Costos

### Que se agrega

Una cuarta pestaña en el Centro de Costos llamada **"Extras"** que muestra una tabla consolidada con TODAS las recetas e insumos marcados como `puede_ser_extra = true`, sin importar a que item pertenecen.

### Interfaz

```text
Pestañas: [Análisis] [Simulador] [Actualizar Precios] [Extras ★]

EXTRAS DISPONIBLES
  Buscar: [___________]

  Nombre                 | Tipo    | Costo    | P. Extra   | FC%      |
  Carne 90g c/cheddar    | Receta  | $1.800   | [$2.500]   | 87% (!) |
  Provoleta grillada     | Receta  | $600     | [$1.800]   | 40% (!) |
  Extra queso cheddar    | Insumo  | $250     | [$500]     | 61% (!) |
  Salsa BBQ              | Receta  | $180     | [  —  ]    | —       |
  ...

  * P. Extra es editable inline. Cambiar el precio aca actualiza
    preparaciones.precio_extra o insumos.precio_extra (centralizado).
  * FC% = costo / (precio_extra / 1.21) * 100, con semaforo.
  * Items sin precio_extra muestran "—" y se pueden completar.
```

### Detalles tecnicos

**Archivo a modificar:** `src/pages/admin/CentroCostosPage.tsx`

1. Agregar `'extras'` al tipo `Tab` existente
2. Agregar la pestaña al array `tabs` con icono `Package`
3. Crear componente `ExtrasTab` dentro del mismo archivo que:
   - Filtra de `preparaciones` e `insumos` (ya cargados en el page) los que tienen `puede_ser_extra = true`
   - Muestra tabla con: Nombre, Tipo (Receta/Insumo), Costo, P. Extra (input editable), FC% (badge semaforo)
   - Usa `useItemExtrasMutations().updatePrecioExtra` para guardar cambios de precio con debounce/onBlur
   - Incluye buscador por nombre
   - Los que no tienen `precio_extra` definido muestran input vacio para completar

No se crean archivos nuevos ni se modifica la base de datos. Se reusan los datos y mutations que ya existen.

