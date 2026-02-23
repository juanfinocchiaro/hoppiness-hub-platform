
# Fix: Grupos opcionales permiten seleccionar multiples cuando deberian limitar a 1

## Problema

El grupo "Bebida a eleccion" de la Ultracheese tiene `max_selecciones = null` en la base de datos. El codigo actual interpreta `null` como "sin limite", permitiendo tildar todas las bebidas. El comportamiento correcto es que si `max_selecciones` es `null`, se trate como `1` (elegir una sola opcion).

## Solucion

### Opcion elegida: Corregir en el frontend

En `src/components/webapp/ProductCustomizeSheet.tsx`, normalizar `max_selecciones` null a 1 al momento de usarlo.

### Cambios

**`src/components/webapp/ProductCustomizeSheet.tsx`**

1. **Linea 134** - Donde se determina si es radio: cambiar la logica para que `null` tambien sea tratado como 1:

   Antes:
   ```
   const isRadio = group.max_selecciones === 1;
   ```
   Despues:
   ```
   const effectiveMax = group.max_selecciones ?? 1;
   const isRadio = effectiveMax === 1;
   ```

2. **Linea 148** - Actualizar el texto del badge para usar `effectiveMax` en vez de `group.max_selecciones`.

3. **Linea 160** - Pasar `effectiveMax` en vez de `group.max_selecciones` a `handleGroupSelect`:

   Antes:
   ```
   group.max_selecciones
   ```
   Despues:
   ```
   effectiveMax
   ```

Con esto, cuando `max_selecciones` es `null`, el grupo se comporta como radio (elegir 1), mostrando el texto "Elegi 1" y reemplazando la seleccion anterior al elegir otra opcion.
