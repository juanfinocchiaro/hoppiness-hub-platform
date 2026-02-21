
# Fix: Header unificado en toda la Webapp

## Estado: ✅ IMPLEMENTADO

Se creó `WebappHeader.tsx` como componente único y se integró en todas las pantallas:

| Pantalla | Header | Props |
|----------|--------|-------|
| Landing `/` | `WebappHeader` | `title="HOPPINESS CLUB" showNavMenu` |
| Selector `/pedir` | `WebappHeader` | `title="Pedí Online" showBack` |
| Menú `/pedir/:slug` | `WebappHeader` | `title={branch.name} subtitle={servicio} showBack showSearch extraActions={viewToggle}` + children (service pills, search bar, category tabs, active order banner) |
| Nosotros | `WebappHeader` | `title="Nosotros" showBack showNavMenu` |
| Franquicias | `WebappHeader` | `title="Franquicias" showBack showNavMenu` |
| Contacto | `WebappHeader` | `title="Contacto" showBack showNavMenu` |

### Archivos creados
- `src/components/webapp/WebappHeader.tsx`

### Archivos modificados
- `src/pages/Index.tsx` — Reemplazó `PublicHeader` por `WebappHeader`
- `src/pages/Pedir.tsx` — Reemplazó header azul + hero por `WebappHeader`
- `src/components/webapp/WebappMenuView.tsx` — Reemplazó header inline por `WebappHeader` con children
- `src/pages/Nosotros.tsx` — Reemplazó `PublicHeader`
- `src/pages/Franquicias.tsx` — Reemplazó `PublicHeader`
- `src/pages/Contacto.tsx` — Reemplazó `PublicHeader` (2 instancias)
