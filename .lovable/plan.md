

# Refactorizacion: Mis Pedidos, Direcciones y Perfil como experiencia de Tienda

## Problema

Actualmente "Mis Pedidos", "Mis Direcciones" y "Mi Perfil" existen en DOS lugares:
1. Como **paginas dentro de Mi Cuenta** (`/cuenta/pedidos`, `/cuenta/direcciones`, `/cuenta/perfil`) con sidebar de sistema, tipografia de admin, layout de panel interno.
2. Como **Sheets inline** dentro de `/pedir/:slug` (ya implementados: `MisPedidosSheet`, `DireccionesSheet`, `PerfilSheet`).

El usuario ve la version de "Mi Cuenta" que rompe la fluidez. Estas 3 secciones son de **cliente final**, no de staff operativo. Solo "Mi Local" y "Mi Marca" son "sistemas".

## Solucion

Eliminar las rutas de sistema (`/cuenta/pedidos`, `/cuenta/direcciones`) y que estas funcionalidades vivan exclusivamente como **Sheets inline** dentro del contexto de tienda. El perfil del cliente se maneja via el `PerfilSheet`. Mi Cuenta conserva el perfil de staff (con PIN, password, datos laborales) para empleados.

---

## Cambios

### 1. CuentaSidebar: Eliminar secciones de cliente

Remover de `CuentaSidebar.tsx`:
- La seccion "MIS PEDIDOS" completa (Historial + Mis Direcciones)
- El link "Mi Perfil" (el perfil de cliente se gestiona desde la tienda; el de staff ya esta en CuentaHome)

Solo quedan: Inicio, Mi Trabajo, Solicitudes, Comparativo, Comunicados, Reglamento.

### 2. App.tsx: Eliminar rutas de paginas de cliente

Eliminar las rutas bajo `/cuenta`:
- `<Route path="pedidos" ... />`
- `<Route path="direcciones" ... />`

Mantener `<Route path="perfil" ... />` porque CuentaPerfil tiene funcionalidades de staff (PIN de fichaje, cambio de password) que no estan en PerfilSheet.

### 3. UserMenuDropdown: Siempre abrir Sheets, nunca navegar a /cuenta

Cambiar los fallbacks del `UserMenuDropdown`:
- `onMisPedidos` fallback: ya no navega a `/cuenta/pedidos`. Si no se pasa callback, no muestra la opcion o navega a `/pedir` con un param.
- `onMisDirecciones` fallback: idem.
- `onMiPerfil` fallback: idem.

Como el `UserMenuDropdown` siempre recibe callbacks cuando esta dentro de PedirPage (que es el unico lugar donde se usa la tienda), esto ya funciona. Solo hay que asegurar que fuera de la tienda (ej: landing, nosotros) los items del dropdown no intenten navegar a `/cuenta/...`.

**Solucion**: Si no hay callbacks, ocultar esas opciones del dropdown (ya que solo tienen sentido dentro de la tienda).

### 4. CuentaHome: Quitar boton "Mis pedidos"

En `CuentaHome.tsx` hay un boton que navega a `/cuenta/pedidos`. Reemplazarlo con un link a `/pedir` (la tienda) o eliminarlo.

### 5. Paginas institucionales (Landing, Nosotros, Franquicias, Contacto)

El `WebappHeader` en estas paginas NO pasa callbacks de Sheets. Entonces el `UserMenuDropdown` NO debe mostrar "Mis pedidos" / "Mis direcciones" / "Mi perfil" como opciones que naveguen a `/cuenta/...`.

**Dos opciones**:
- **A)** Ocultar esas opciones cuando no hay callbacks (solucion simple)
- **B)** Navegar a `/pedir` con params tipo `?action=pedidos` para que PedirPage abra el sheet automaticamente

Recomiendo **opcion A** por simplicidad: en paginas institucionales el dropdown solo muestra nombre, email, y links a Mi Local / Mi Marca / Cerrar sesion.

---

## Resumen de archivos

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/CuentaSidebar.tsx` | Eliminar seccion "MIS PEDIDOS" (Historial + Direcciones) y link "Mi Perfil" |
| `src/App.tsx` | Eliminar rutas `/cuenta/pedidos` y `/cuenta/direcciones`, mantener `/cuenta/perfil` para staff |
| `src/components/webapp/UserMenuDropdown.tsx` | Si no hay callbacks, ocultar "Mis pedidos", "Mis direcciones", "Mi perfil" del dropdown |
| `src/pages/cuenta/CuentaHome.tsx` | Cambiar boton "Mis pedidos" para ir a `/pedir` en vez de `/cuenta/pedidos` |

### Archivos que se conservan (no se eliminan)
- `MisPedidosPage.tsx` y `MisDireccionesPage.tsx`: se desconectan de rutas pero pueden eliminarse si se prefiere limpieza total
- `MisPedidosSheet.tsx`, `DireccionesSheet.tsx`, `PerfilSheet.tsx`: ya existen y funcionan correctamente dentro de PedirPage

