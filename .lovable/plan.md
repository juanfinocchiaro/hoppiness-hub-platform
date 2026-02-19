

## Plan: Convivencia WebApp + MasDelivery

### Situacion actual

- `/pedir` muestra un iframe de MasDelivery (igual para todos los locales)
- `/pedir/:branchSlug` ya existe como ruta de la nueva WebApp
- La tabla `webapp_config` existe con campo `estado` pero NO tiene `webapp_activa`
- Todos los locales tienen `estado = 'cerrado'`

### Cambios a implementar

**1. Migracion SQL: agregar columna `webapp_activa`**

Agregar `webapp_activa BOOLEAN DEFAULT false` a `webapp_config`. Este flag controla si un local usa la WebApp propia o MasDelivery.

**2. Reescribir `src/pages/Pedir.tsx`**

Reemplazar el iframe de MasDelivery por un selector de sucursales inteligente:
- Query publica a `branches` + `webapp_config`
- Grid de cards con cada sucursal activa (excluyendo "Muy Pronto")
- Si `webapp_activa = true`: badge "Nuevo: Pedi directo" y boton que lleva a `/pedir/manantiales`
- Si `webapp_activa = false`: badge "Via MasDelivery" y boton que abre link externo
- Header con logo y boton "Volver"

**3. Actualizar `src/pages/webapp/PedirPage.tsx`**

Agregar fallback: si el usuario entra a `/pedir/general-paz` pero ese local no tiene `webapp_activa = true`, mostrar pantalla amigable con boton a MasDelivery en vez del error generico actual.

**4. Actualizar `src/hooks/useWebappMenu.ts`**

Incluir `webapp_activa` en la query de `useWebappConfig` para que `PedirPage` pueda chequear el flag.

**5. Actualizar tipo `WebappConfig` en `src/types/webapp.ts`**

Agregar `webapp_activa: boolean` al tipo.

### Activacion de Manantiales

Una vez implementado, se hace un simple UPDATE en la base de datos:

```text
UPDATE webapp_config SET webapp_activa = true WHERE branch_id = '<id-manantiales>';
```

Eso es todo lo que se necesita para que Manantiales use la WebApp propia y el resto siga en MasDelivery.

### Resumen de archivos

| Archivo | Accion |
|---|---|
| Migracion SQL | Agregar `webapp_activa` a `webapp_config` |
| `src/types/webapp.ts` | Agregar campo al tipo |
| `src/hooks/useWebappMenu.ts` | Incluir campo en query |
| `src/pages/Pedir.tsx` | Reescribir con selector de locales |
| `src/pages/webapp/PedirPage.tsx` | Agregar fallback para locales sin WebApp |

