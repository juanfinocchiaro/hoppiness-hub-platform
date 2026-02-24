

## Plan: Mostrar POCITO + Reemplazar fotos por mapas en la landing

### Problema 1: POCITO no aparece
La sucursal POCITO tiene `is_active = false` en la base de datos. La vista `branches_public` filtra por `is_active = true`, por lo que POCITO queda excluida. Su `public_status` ya es `coming_soon`, que es correcto.

**Solución**: Migración SQL para poner `is_active = true` en la sucursal POCITO.

```sql
UPDATE branches SET is_active = true WHERE id = '2eff63ad-b4af-4777-ae59-447e8f001b66';
```

### Problema 2: Reemplazar fotos por mapas (como en /pedir pero mas grandes)

**Archivo**: `src/components/landing/LocationsSection.tsx`

Cambios:
- Eliminar imports de fotos (`localMan`, `localNvc`, `localGp`, `localVa`, `localVcp`)
- Eliminar el objeto `BRANCH_PHOTOS` y la función `getBranchPhoto`
- Importar `StaticBranchMap` desde `@/components/webapp/StaticBranchMap`
- En cada card de sucursal activa: reemplazar el bloque `{photo && <div>...<img>...</div>}` por un `StaticBranchMap` con `height={192}` (equivalente a h-48) cuando la sucursal tenga coordenadas
- En cada card de sucursal "coming_soon" (como POCITO): mostrar también el mapa si tiene coordenadas, con un padding similar al de /pedir
- Eliminar el link "Ver en Maps" del contenido ya que el mapa ya tiene su propio "Cómo llegar"

### Resultado esperado
- 5 sucursales activas + POCITO como "Próximamente" = 6 cards
- Cada card muestra un mapa de OpenStreetMap con el pin de Hoppiness en vez de foto
- El mapa tiene ~192px de alto (igual que las fotos actuales)
- Click en el mapa abre Google Maps

