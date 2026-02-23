

# Fix: Navegacion "Nuestros Clubes" causa recarga completa

## Problema

En `AppHeader.tsx`, el link "Nuestros Clubes" usa `<a href="/#clubes">` (HTML nativo) en vez de React Router. Cuando estas en cualquier pagina que NO sea Home (Contacto, Nosotros, Franquicias), al hacer click se produce una **recarga completa del navegador** en vez de una transicion SPA fluida.

Esto causa:
- Descarga completa de la app de nuevo
- Re-render de toda la landing (hero, 6 fotos de locales, menu showcase, premios, medios, reviews)
- Congelamiento visible de 2-3 segundos

## Solucion

Cambiar el `<a href>` por navegacion React Router. El `PublicLayout` ya tiene logica para detectar `/#clubes` y hacer scroll automatico al elemento.

## Cambio

**Archivo**: `src/components/layout/AppHeader.tsx`

En la funcion `PublicCenter` (linea ~131-143), reemplazar el `<a>` por `Link` de React Router:

```tsx
// ANTES (linea 133):
<a key={item.to} href={isHome ? '#clubes' : '/#clubes'}>

// DESPUES:
<Link key={item.to} to={isHome ? '#clubes' : '/#clubes'}>
  ...
</Link>
```

Y lo mismo en `PublicMobileMenu` (linea ~199):

```tsx
// ANTES:
<a href={isHome ? '#clubes' : '/#clubes'} onClick={() => setOpen(false)}>

// DESPUES:
<Link to={isHome ? '#clubes' : '/#clubes'} onClick={() => setOpen(false)}>
```

Ademas, cuando `isHome` es true y se hace click en `#clubes`, hay que hacer scroll manual ya que React Router no cambia el pathname y no dispara el useEffect de PublicLayout. Para esto se agrega un `onClick` que haga `scrollIntoView` directamente cuando ya estamos en Home.

### Detalle tecnico

| Archivo | Cambio |
|---------|--------|
| `src/components/layout/AppHeader.tsx` | Reemplazar `<a href>` por `<Link to>` en PublicCenter y PublicMobileMenu para "Nuestros Clubes". Agregar onClick con scrollIntoView para el caso isHome. |

Un solo archivo, dos cambios puntuales.
