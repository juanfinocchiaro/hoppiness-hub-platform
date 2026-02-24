

## Plan: Corregir 3 problemas

### Problema 1: Año 2025 en timeline
En `MediaSection.tsx`, el último evento del timeline dice `year: '2025'` con título "Mejor Hamburguesería". Debe decir `year: '2024'`.

**Archivo**: `src/components/landing/MediaSection.tsx` linea 33
- Cambiar `{ year: '2025', title: 'Mejor Hamburguesería', subtitle: 'de Córdoba', isAward: true }` a `{ year: '2024', ... }`

---

### Problema 2 y 3: "0 locales" y "No hay locales disponibles"
**Causa raíz**: Las queries a `branches_public` solicitan la columna `google_place_id`, pero esa columna **no existe en la vista** `branches_public` (sí existe en la tabla `branches`). Esto genera un error de PostgreSQL que hace que la query devuelva vacío silenciosamente.

Los logs de la base de datos lo confirman: `column branches_public.google_place_id does not exist`.

**Solución**: Eliminar `google_place_id` del SELECT de ambas queries, y construir la URL de Google Maps usando latitud/longitud (que sí están en la vista) o el nombre del local.

**Archivos a modificar**:

1. **`src/components/landing/LocationsSection.tsx`** (linea 130)
   - Quitar `google_place_id` del `.select(...)`
   - Quitar `google_place_id` de la interfaz `BranchPublic`
   - Ajustar `getGoogleMapsUrl` para no depender de `google_place_id` (usar lat/lng o nombre)

2. **`src/pages/Pedir.tsx`** (linea 81)
   - Quitar `google_place_id` del `.select(...)`
   - Quitar `google_place_id` de la interfaz `PedirBranch`
   - Ajustar `mapsUrl` para usar lat/lng o nombre

### Detalle tecnico
La vista `branches_public` expone: `id, name, address, city, slug, opening_time, closing_time, public_status, public_hours, cover_image_url, latitude, longitude, is_active, is_open, local_open_state`. No incluye `google_place_id`. La solución es simplemente dejar de pedir esa columna y usar `latitude`/`longitude` para los links de Google Maps, que funcionan igual de bien.

